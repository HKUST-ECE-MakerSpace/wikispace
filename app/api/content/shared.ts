import { promises as fs, type Dirent } from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from '@/lib/paths';

/** Root every editable path must resolve inside. */
export { CONTENT_DIR };

/** Editable filenames: letters, digits, hyphens, dots, slashes — nothing else. */
const PATH_RE = /^[a-z0-9-./]+$/i;
const ALLOWED_EXTENSIONS = ['.mdx', '.md', '.json'];

export class ContentPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentPathError';
  }
}

/**
 * Validate a user-supplied POSIX-relative path and resolve it inside
 * content/docs. Rejects `..` segments, absolute paths, backslashes,
 * unexpected characters and non-editable extensions.
 */
export function resolveContentPath(relativePath: unknown): string {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/') ||
    !PATH_RE.test(relativePath)
  ) {
    throw new ContentPathError(`invalid path: ${JSON.stringify(relativePath)}`);
  }

  const segments = relativePath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new ContentPathError(`invalid path: ${relativePath}`);
  }

  const extension = path.extname(relativePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ContentPathError(`extension "${extension}" is not editable`);
  }

  const absolute = path.resolve(CONTENT_DIR, relativePath);
  const inside = path.relative(CONTENT_DIR, absolute);
  if (inside.startsWith('..') || path.isAbsolute(inside)) {
    throw new ContentPathError(`path escapes content/docs: ${relativePath}`);
  }
  return absolute;
}


/** Extract the `title` value from frontmatter without a YAML parser. */
export function frontmatterTitle(raw: string): string | undefined {
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const title = block?.match(/^title:[ \t]*(.+)$/m)?.[1]?.trim();
  if (!title) return undefined;
  return title.replace(/^["']|["']$/g, '');
}

export interface TreeFile {
  path: string;
  title: string;
}

/** Every editable file under content/docs, sorted naturally by path. */
export async function listContentFiles(): Promise<TreeFile[]> {
  const files: TreeFile[] = [];
  await walk(CONTENT_DIR, '', files);
  files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  return files;
}

async function walk(dir: string, relDir: string, files: TreeFile[]): Promise<void> {
  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const dirent of dirents) {
    const rel = relDir ? `${relDir}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      await walk(path.join(dir, dirent.name), rel, files);
      continue;
    }
    if (!dirent.isFile()) continue;

    const lower = dirent.name.toLowerCase();
    if (lower.endsWith('.mdx') || lower.endsWith('.md')) {
      let title: string | undefined;
      try {
        title = frontmatterTitle(await fs.readFile(path.join(dir, dirent.name), 'utf8'));
      } catch {
        // unreadable file → still list it, filename title
      }
      files.push({
        path: rel,
        title: title ?? dirent.name.replace(/\.mdx?$/i, '').replace(/[-_]/g, ' '),
      });
    } else if (lower === 'meta.json') {
      files.push({ path: rel, title: dirent.name });
    }
  }
}
