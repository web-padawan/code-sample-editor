import { fetchAsText } from './util';

// matches only what's in the url of an import statement.
const importUrlRegex = /(?:(?:import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(.*)(?:\s*['"]))/g;
const exportUrlRegex = /(?:(?:export\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*from\s*['"]\s*)(.*)(?:\s*['"]))/g;
// matches only the import statement not the url
const importRegex = /(?:(import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(?:.*)(\s*['"]))/g;
const exportRegex = /(?:(export\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*from\s*['"]\s*)(?:.*)(\s*['"]))/g;

const startLineRegex = /^[\/\.]+/;

export const getTsTypesFromDeps = async (
  deps: string[]
): Promise<Map<string, { body: string; root: string }>> => {
  const depsCrawling = [];
  const fileContentsMap = new Map<string, { body: string; root: string }>();
  for (const dep of deps) {
    const depCrawled = crawlDepAndUpdateMap(dep, fileContentsMap);
    depsCrawling.push(depCrawled);
  }

  const depCrawled = await Promise.all(depsCrawling);
  return fileContentsMap;
};

const crawlDepAndUpdateMap = async (
  depName: string,
  fileContentsMap: Map<string, { body: string; root: string }>
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
        const fetched = fetchAsText(file).then(res => {
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
  const unpkgRoot = `https://unpkg.com/${name}`;
  const defTypedRoot = `https://unpkg.com/@types/${name}`;
  const packageJson = await fetch(`${unpkgRoot}/package.json`).then(res =>
    res.json()
  );

  const main: string =
    packageJson.main instanceof String ? packageJson.main : '';

  if (main) {
    let strippedMain = main.replace(/^\//, '');
    strippedMain = strippedMain.replace(/\.js/, '');

    const mainCheck: Promise<string | null> = fetch(
      `${unpkgRoot}/${strippedMain}.d.ts`
    ).then(res => {
      return res.status === 404 ? Promise.resolve(null) : res.text();
    });
    const defTypedCheck = fetch(`${defTypedRoot}/${strippedMain}.d.ts`).then(
      res => {
        return res.status === 404 ? Promise.resolve(null) : res.text();
      }
    );

    const [mainText, defTypedText] = await Promise.all([
      mainCheck,
      defTypedCheck
    ]);
    const lastSlash = strippedMain.lastIndexOf('/');
    const mainRoot = strippedMain.substring(0, lastSlash);

    if (mainText) {
      const root = `${unpkgRoot}/${mainRoot}/`;
      return { body: mainText, root };
    } else if (defTypedText) {
      const root = `${defTypedRoot}/${mainRoot}/`;
      return { body: defTypedText, root };
    }
  }

  return null;
};

const getImportUrlsFromFileContents = (fileContents: string): Set<string> => {
  const urls: Set<string> = new Set();
  let match: RegExpExecArray | null = null;
  while ((match = importUrlRegex.exec(fileContents))) {
    urls.add(match[1]);
  }
  while ((match = exportUrlRegex.exec(fileContents))) {
    urls.add(match[1]);
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
      const rootedUrlStr = url.replace(startLineRegex, '');
      const rootedUrlUrl = new URL(`${rootUrl}/${rootedUrlStr}`);
      const resolvedURL = rootedUrlUrl.href;
      local.add(resolvedURL);
    } else {
      deps.add(url);
    }
  }

  return { local, deps };
};
