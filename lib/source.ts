import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReactNode } from 'react';
import type { Node } from 'fumadocs-core/page-tree';

import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type {
  LoaderOutput,
  Meta,
  MetaData,
  Page,
  PageData,
  StaticSource,
} from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/config';
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';

import { applyTreeIcons } from './page-tree-icons';

import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { CONTENT_DIR } from './paths';
/**
 * Collection definitions for the runtime compiler — keyed like the exports of
 * a source configuration file. No build-time macro: files are read from disk
 * per request, so web UI edits appear without a rebuild.
 */
const configExports = {
  docs: defineDocs({
    dir: 'content/docs',
    docs: {
      schema: pageSchema,
      postprocess: {
        includeProcessedMarkdown: true,
      },
    },
    meta: {
      schema: metaSchema,
    },
  }),
};

/** Compiled MDX content of a page (result of `load()`). */
export interface LoadedDoc {
  /** Compiled MDX component */
  body: (props: { components?: Record<string, unknown> }) => ReactNode;
  /** table of contents */
  toc: { title: string; url: string; depth: number }[];
  /** pre-built search index payload for this page */
  structuredData: StructuredData;
}

/** Frontmatter + runtime methods available on every docs page entry. */
export interface DocsPageData extends PageData {
  /** lazily compiled page content */
  load(): Promise<LoadedDoc>;
  /** search index payload for this page */
  structuredData(): Promise<StructuredData>;
  /** raw ('raw') or remark-processed ('processed') markdown source */
  getText(type: 'raw' | 'processed'): Promise<string>;
  [key: string]: unknown;
}

/** Source config handed to the fumadocs loader. */
export interface DocsSourceConfig {
  pageData: DocsPageData;
  metaData: MetaData;
}

/** The docs source: pages, page tree and search over content/docs. */
export type DocsSource = LoaderOutput<{
  page: Page<undefined, DocsPageData>;
  meta: Meta<undefined, MetaData>;
  i18n: undefined;
}>;

export type DocsPage = DocsSource['$inferPage'];

interface ScannedEntry {
  info: {
    /** virtual path, relative to the content dir, POSIX separators */
    path: string;
    fullPath: string;
  };
  /** parsed frontmatter */
  data: Record<string, unknown>;
}

interface ScanResult {
  entries: ScannedEntry[];
  /** meta.json files keyed by their relative path */
  meta: Record<string, Record<string, unknown>>;
  /** per-file fingerprints: `${path}:${sha1(content)}` */
  hashes: string[];
  hash: string;
}

const DOC_EXTENSIONS = ['.mdx', '.md'];

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

async function scanDir(absDir: string, relDir: string, result: ScanResult): Promise<void> {
  let dirents;
  try {
    dirents = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return; // missing content dir → empty source
  }

  for (const dirent of dirents) {
    const rel = relDir ? `${relDir}/${dirent.name}` : dirent.name;
    const abs = path.join(absDir, dirent.name);
    // Hidden files (`.x`) and partials (`_x`) never become pages — the editor
    // uses them for live-preview drafts without polluting the tree or search.
    if (dirent.name.startsWith('.') || dirent.name.startsWith('_')) continue;
    if (dirent.isDirectory() && dirent.name === 'node_modules') continue;
    if (dirent.isDirectory()) {
      await scanDir(abs, rel, result);
      continue;
    }

    if (dirent.name === 'meta.json') {
      try {
        const raw = await fs.readFile(abs, 'utf8');
        result.meta[rel] = JSON.parse(raw) as Record<string, unknown>;
        result.hashes.push(`${rel}:${sha1(raw)}`);
      } catch (error) {
        console.error(`[content] invalid JSON in ${rel}:`, error);
      }
      continue;
    }

    if (!DOC_EXTENSIONS.some((ext) => dirent.name.endsWith(ext))) continue;

    const raw = await fs.readFile(abs, 'utf8');
    result.entries.push({
      info: { path: rel, fullPath: abs },
      data: normalizePageData(raw, dirent.name),
    });
    result.hashes.push(`${rel}:${sha1(raw)}`);
  }
}

/** Parse frontmatter and guarantee title/description exist. */
function normalizePageData(raw: string, fallbackName: string): Record<string, unknown> {
    const parsed = frontmatter(raw);
    const data = (parsed.data ?? {}) as Record<string, unknown>;
    if (typeof data.title !== 'string' || data.title.length === 0) {
      const heading = parsed.content.match(/^#\s+(.+)$/m);
      data.title = heading?.[1]?.trim() ?? fallbackName.replace(/\.mdx?$/i, '').replace(/[-_]/g, ' ');
    }
    if (typeof data.description !== 'string') data.description = '';
    return data;
}

async function scanContent(): Promise<ScanResult> {
  const result: ScanResult = { entries: [], meta: {}, hashes: [], hash: '' };
  await scanDir(CONTENT_DIR, '', result);
  result.hash = sha1([...result.hashes].sort().join('|'));
  return result;
}

/**
 * Who may read a page, from the frontmatter `access` key. An absent key means
 * `public`. The order is least to most privileged, so a numeric rank compares
 * a page's level against a caller's level directly.
 */
export type Access = 'public' | 'members' | 'admin';

const ACCESS_RANK: Record<Access, number> = { public: 0, members: 1, admin: 2 };

/**
 * Frontmatter `access` → level, failing closed: only the exact strings
 * `public` and `members` are read as themselves, and anything else — `admin`,
 * YAML-1.1 spellings (`yes`, `on`, `1`), numbers, quoted strings, typos — is
 * treated as `admin`, so a mistake keeps a page internal instead of
 * publishing it.
 */
export function pageAccess(data: Record<string, unknown>): Access {
  const raw = data.access;
  if (raw === undefined || raw === 'public') return 'public';
  if (raw === 'members') return 'members';
  return 'admin';
}

/** Options for {@link getDocsSource}. */
export interface DocsSourceOptions {
  /**
   * Highest access level the caller may read; defaults to `public`. Pages
   * above it are dropped before the loader runs, so they exist nowhere in the
   * returned source: not in the tree, search index, page lookups or exports.
   * Pass `members` for a caller holding a wiki-admin session or a verified
   * accounts-service session, and `admin` only on surfaces that have already
   * verified a wiki-admin session (the editor's live preview).
   */
  visibility?: Access;
}

/**
 * Sources cached per content hash × visibility variant. Only the current
 * content hash's entries are kept — old sources are evicted on rebuild so
 * the cache stays bounded at two entries no matter how often content
 * changes (each editor save rotates the hash).
 */
const sourceCache = new Map<string, DocsSource>();

/**
 * Docs source compiled from the file system at request time. Re-compiles
 * only when content changes (hash of paths + file contents).
 *
 * Returns the **public** variant by default: pages whose frontmatter `access`
 * is above `public` are dropped before the loader runs. Pass the caller's
 * level as `{ visibility }` only on surfaces that have verified the session
 * that level requires.
 */
export async function getDocsSource(options: DocsSourceOptions = {}): Promise<DocsSource> {
  const { visibility = 'public' } = options;
  const scan = await scanContent();
  const key = `${visibility}:${scan.hash}`;
  const hit = sourceCache.get(key);
  if (hit) return hit;

  const maxRank = ACCESS_RANK[visibility];
  const entries = scan.entries.filter((entry) => ACCESS_RANK[pageAccess(entry.data)] <= maxRank);
  const source = await buildSource({ ...scan, entries });
  for (const existing of sourceCache.keys()) {
    if (!existing.endsWith(`:${scan.hash}`)) sourceCache.delete(existing);
  }
  sourceCache.set(key, source);
  return source;
}

/** The editor's live-preview draft: content/docs/_preview.mdx → slug "preview". */
export const PREVIEW_FILE = '_preview.mdx';

let previewCache: { hash: string; source: DocsSource } | undefined;

/**
 * Like getDocsSource but with the hidden editor draft included as an extra
 * page — and it **always includes restricted pages** (`visibility: 'admin'`),
 * so callers must be wiki-admin-gated (only the editor preview is). The
 * scanner skips underscore files, so the draft itself never leaks into the
 * public tree or search; only this source knows about it.
 */
export async function getPreviewSource(): Promise<DocsSource> {
  const draftAbs = path.join(CONTENT_DIR, PREVIEW_FILE);
  let raw: string;
  try {
    raw = await fs.readFile(draftAbs, 'utf8');
  } catch {
    return getDocsSource({ visibility: 'admin' }); // no draft yet → plain source
  }
  const draftHash = sha1(raw);
  if (previewCache?.hash === draftHash) return previewCache.source;

  const scan = await scanContent();
  const withDraft: ScanResult = {
    ...scan,
    entries: [
      ...scan.entries,
      { info: { path: 'preview.mdx', fullPath: draftAbs }, data: normalizePageData(raw, PREVIEW_FILE) },
    ],
  };
  const source = await buildSource(withDraft);
  previewCache = { hash: draftHash, source };
  return source;
}

/**
 * A folder whose every page was filtered out (say, all `access: admin`) would
 * still become a sidebar node with no children. Drop those before rendering so
 * the section itself stays invisible, not just its contents.
 */
function pruneChildlessFolders(nodes: Node[]): Node[] {
  const kept: Node[] = [];
  for (const node of nodes) {
    if (node.type !== 'folder') {
      kept.push(node);
      continue;
    }
    const children = pruneChildlessFolders(node.children);
    if (children.length > 0 || node.index !== undefined) kept.push({ ...node, children });
  }
  return kept;
}

/** Compile a scan into a loader output with sidebar icons resolved. */
async function buildSource(scan: ScanResult): Promise<DocsSource> {
  const runtime = await dynamic(configExports, { environment: 'runtime', root: process.cwd() });
  const collection = await runtime.docs('docs', CONTENT_DIR, scan.meta, scan.entries);
  // Cast at the package boundary: fumadocs-mdx's Source type is structurally
  // identical to StaticSource<DocsSourceConfig>, but its generics
  // (AsyncDocCollectionEntry) cannot unify with ours, so TS needs the
  // intermediate unknown.
  const source: DocsSource = loader({
    baseUrl: docsRoute,
    source: collection.toFumadocsSource() as unknown as StaticSource<DocsSourceConfig>,
  });

  // String icons (meta.json / frontmatter) would render as literal text in
  // the sidebar; swap them for lucide components on every tree read.
  const bareGetPageTree = source.getPageTree.bind(source);
  source.getPageTree = () => {
    const tree = applyTreeIcons(bareGetPageTree());
    return { ...tree, children: pruneChildlessFolders(tree.children) };
  };
  return source;
}

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];
  return {
    segments,
    url:
      '/' +
      [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];
  return {
    segments,
    url:
      '/' +
      [page.locale, ...docsContentRoute.split('/'), ...segments]
        .filter(Boolean)
        .join('/'),
  };
}

export async function getLLMText(page: DocsPage): Promise<string> {
  const processed = await page.data.getText('processed');
  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
