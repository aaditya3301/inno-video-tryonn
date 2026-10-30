/** Real keys are long tokens without spaces; this skips headers, labels and notes. */
export const KEY_PATTERN = /^[A-Za-z0-9_.\-]{20,}$/;

const clean = (cell: string) => cell.trim().replace(/^["']|["']$/g, "");

/** Every key in a keys.csv style text: one or more per line, `#` comments and labels ignored. */
export function parseKeys(text: string): string[] {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .flatMap((line) => line.split(/[,;\t]/))
    .map(clean)
    .filter((cell) => KEY_PATTERN.test(cell));
}

/** The text with one more key on its own line at the end, keeping the file's line-ending style. */
export function appendKey(text: string, key: string): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const body = text === "" || text.endsWith("\n") ? text : text + eol;
  return `${body}${key}${eol}`;
}

/**
 * The same text with the given keys taken out. A line that only held a dead key
 * (and maybe a label) is dropped; other keys on the same line, comments, headers
 * and blank lines are left exactly as they were.
 */
export function stripKeys(text: string, dead: ReadonlySet<string>): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return text
    .split(/\r?\n/)
    .flatMap((line) => {
      if (line.trim().startsWith("#")) return [line];
      const cells = line.split(/[,;\t]/);
      if (!cells.some((cell) => dead.has(clean(cell)))) return [line];
      const rest = cells.filter((cell) => !dead.has(clean(cell)));
      return rest.some((cell) => KEY_PATTERN.test(clean(cell))) ? [rest.join(",")] : [];
    })
    .join(eol);
}
