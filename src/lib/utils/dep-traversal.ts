import { fetchAsText, fetchAsJSON, endWithSlash } from './util';
import { TsTypeMap } from './types';

// matches only what's in the url of an import statement.
const importUrlRegex = /(?:import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(.*)(?:\s*['"])/g;
const exportUrlRegex = /(?:export(?:[\s\w,\*])*{?(?:[\s\w,\*])*}?\s*from?\s*['"]\s*)(.*)(?:\s*['"])/g;
// matches only the import statement not the url
const importRegex = /(import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(?:.*)(\s*['"])/g;
const exportRegex = /(export(?:[\s\w,\*])*{?(?:[\s\w,\*])*}?\s*from?\s*['"]\s*)(?:.*)(\s*['"])/g;

const startLineRegex = /^[\.\/]+/;

export const getTsTypesFromDeps = async (
  deps: string[]
): Promise<TsTypeMap> => {
  const depsCrawling = [];
  const fileContentsMap = new Map();
  for (const dep of deps) {
    const depCrawled = crawlDepAndUpdateMap(dep, fileContentsMap);
    depsCrawling.push(depCrawled);
  }

  await Promise.all(depsCrawling);
  return fileContentsMap;
};

const crawlDepAndUpdateMap = async (
  depName: string,
  fileContentsMap: TsTypeMap
): Promise<void> => {
  if (!fileContentsMap.has(depName)) {
    const entrypointContents = await getMainTypeDefFromPackageName(depName);
    if (!entrypointContents) {
      return;
    }

    fileContentsMap.set(depName, entrypointContents);

    const importUrls = getImportUrlsFromFileContents(entrypointContents.body);
    const { local, deps } = normalizeUrls(entrypointContents.root, importUrls);
    const fetches = [];

    for (const file of local) {
      if (!fileContentsMap.has(file)) {
        const fetched = fetchAsText(`https://unpkg.com/${file}`).then(res => {
          fileContentsMap.set(file, {
            body: res,
            root: entrypointContents.root
          });
        });

        fetches.push(fetched);
      }
    }

    for (const dep of deps) {
      fetches.push(crawlDepAndUpdateMap(dep, fileContentsMap));
    }

    await Promise.all(fetches);
  }

  return;
};

const getMainTypeDefFromPackageName = async (
  name: string
): Promise<{ body: string; root: string } | null> => {
  const nameSplit = name.split('/');
  let pkgName = nameSplit.shift()!;
  if (pkgName[0] === '@') {
    const realPkgName = nameSplit.shift()!;
    pkgName = `${pkgName}/${realPkgName}`;
  }
  const fileName = nameSplit.join('/');
  const unpkgRoot = `https://unpkg.com/${pkgName}`;
  let main = '';
  if (fileName) {
    main = fileName;
  } else {
    const packageJson = await fetchAsJSON(`${unpkgRoot}/package.json`);

    main = 'main' in packageJson ? packageJson.main : '';
  }

  if (main) {
    let strippedMain = main.replace(/^\//, '');
    strippedMain = strippedMain.replace(/(\.js)|(\.d\.ts)$/, '');
    const entryDeclarationUrl = `${unpkgRoot}/${strippedMain}.d.ts`;

    let mainCheck: Promise<string | null> = fetch(entryDeclarationUrl).then(
      res => {
        if (res.status === 404) {
          return Promise.resolve(null);
        }
        return res.text();
      }
    );

    const mainText = await mainCheck;
    const lastSlash = strippedMain.lastIndexOf('/');
    const mainRoot = strippedMain.substring(0, lastSlash);

    if (mainText) {
      const root = `${endWithSlash(pkgName)}${
        mainRoot ? endWithSlash(mainRoot) : ''
      }`;
      return { body: mainText, root };
    }
  }

  return null;
};

const getImportUrlsFromFileContents = (fileContents: string): Set<string> => {
  const urls: Set<string> = new Set();
  let match: RegExpExecArray | null = importUrlRegex.exec(fileContents);
  while (match) {
    const declarationFile = match[1].replace(/((\.js)|(\.d\.ts))$/, '.d.ts');
    urls.add(declarationFile);
    match = importUrlRegex.exec(fileContents);
  }

  match = exportUrlRegex.exec(fileContents);
  while (match) {
    const declarationFile = match[1].replace(/((\.js)|(\.d\.ts))$/, '.d.ts');
    urls.add(declarationFile);
    match = exportUrlRegex.exec(fileContents);
  }
  return urls;
};

const normalizeUrls = (
  rootUrl: string,
  urls: Set<string>
): { local: Set<string>; deps: Set<string> } => {
  const local: Set<string> = new Set();
  const deps: Set<string> = new Set();

  for (const url of urls) {
    const isLocal = url.match(startLineRegex);
    if (isLocal) {
      const rootedUrlStr = url.replace(/^\.\//, '');
      const fakeDomain = 'https://asdf.com/';
      const rootedUrlUrl = new URL(
        `${fakeDomain}${endWithSlash(rootUrl)}${rootedUrlStr}`
      );
      const resolvedURL = rootedUrlUrl.href.replace(fakeDomain, '');
      local.add(resolvedURL);
    } else {
      deps.add(url);
    }
  }

  return { local, deps };
};
