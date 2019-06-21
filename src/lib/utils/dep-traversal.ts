// matches only what's in the url of an import statement.
const imexportUrlRegex = /(?:(?:import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(.*)(?:\s*['"]))|(?:(?:export\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*from\s*['"]\s*)(.*)(?:\s*['"]))/g;
// matches only the import statement not the url
const imexportRegex = /(?:(import\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*(?:from)?\s*['"]\s*)(?:.*)(\s*['"]))|(?:(export\s*(?:{?(?:[\s\w,\*]?)+)*}?\s*from\s*['"]\s*)(?:.*)(\s*['"]))/g;

export const getImportUrlsFromFileContents = (
  fileContents: string
): string[] => {
  const urls: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = imexportUrlRegex.exec(fileContents))) {
    urls.push(match[1]);
  }
  return urls;
};
