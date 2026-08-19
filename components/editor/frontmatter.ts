/**
 * Regex frontmatter handling for the editor helper fields. Deliberately not a
 * YAML parser: we only read/patch single-line `title:` and `description:`
 * values and leave everything else in the raw text untouched. When the block
 * can't be safely patched, `editable` is false and the UI disables the fields
 * so the raw editor stays the source of truth.
 */

const BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const KEY_LINE_RE = (key: string) => new RegExp(`^${key}:[ \\t]*(.*)$`, 'm');

export interface FrontmatterFields {
  /** false when the block exists but title/description aren't simple values */
  editable: boolean;
  hasBlock: boolean;
  title: string;
  description: string;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Only *leading* YAML indicators (block styles, anchors, aliases, flow
// collections) make a value unsafe for the simple-line rewrite.
const LEADING_INDICATOR_RE = /^[>|&*[{}]/;

export function parseFrontmatter(raw: string): FrontmatterFields {
  const block = raw.match(BLOCK_RE);
  if (!block) {
    // A stray opening `---` with no closing fence means broken frontmatter.
    return {
      editable: !raw.startsWith('---'),
      hasBlock: false,
      title: '',
      description: '',
    };
  }

const isSimpleScalar = (value: string) => !LEADING_INDICATOR_RE.test(value) && !value.includes('\n');

  let editable = true;
  const titleLine = block[1].match(KEY_LINE_RE('title'))?.[1];
  const descriptionLine = block[1].match(KEY_LINE_RE('description'))?.[1];
  if (titleLine !== undefined && !isSimpleScalar(titleLine)) editable = false;
  if (descriptionLine !== undefined && !isSimpleScalar(descriptionLine)) editable = false;

  return {
    editable,
    hasBlock: true,
    title: titleLine === undefined ? '' : unquote(titleLine),
    description: descriptionLine === undefined ? '' : unquote(descriptionLine),
  };
}

function yamlScalar(value: string): string {
  const clean = value.replaceAll('\n', ' ').trim();
  const needsQuotes =
    /[:#"'{}[\]]|^\s|\s$|^$/.test(clean) ||
    /^[&*!>|@`]/.test(clean) ||
    /^([-?:])(\s|$)/.test(clean);
  return needsQuotes ? JSON.stringify(clean) : clean;
}

export function updateFrontmatter(
  raw: string,
  patch: { title?: string; description?: string },
): string {
  const parsed = parseFrontmatter(raw);
  if (!parsed.editable) return raw;

  if (!parsed.hasBlock) {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined && value !== '');
    if (entries.length === 0) return raw;
    const lines = entries.map(([key, value]) => `${key}: ${yamlScalar(value ?? '')}`);
    return `---\n${lines.join('\n')}\n---\n\n${raw}`;
  }

  let next = raw;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const line = `${key}: ${yamlScalar(value)}`;
    const keyLine = new RegExp(`^${key}:[ \\t]*.*$`, 'm');
    if (keyLine.test(next)) {
      next = next.replace(keyLine, () => line);
    } else if (value !== '') {
      // Insert right after the opening fence (never an empty `key: ""` line
      // for a cleared input).
      next = next.replace(
        /^---\r?\n/,
        () => `---\n${line}\n`,
      );
    }
  }
  return next;
}
