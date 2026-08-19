import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReactNode } from 'react';

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

import { docsContentRoute, docsImageRoute, docsRoute } from './shared';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');
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
    const parsed = frontmatter(raw);
    const data = (parsed.data ?? {}) as Record<string, unknown>;

    // Normalise required page fields so the tree/search always have them.
    if (typeof data.title !== 'string' || data.title.length === 0) {
      const heading = parsed.content.match(/^#\s+(.+)$/m);
      data.title =
        heading?.[1]?.trim() ??
        dirent.name.replace(/\.mdx?$/i, '').replace(/[-_]/g, ' ');
    }
    if (typeof data.description !== 'string') data.description = '';

    result.entries.push({
      info: { path: rel, fullPath: abs },
      data,
    });
    result.hashes.push(`${rel}:${sha1(raw)}`);
  }
}


async function scanContent(): Promise<ScanResult> {
  const result: ScanResult = { entries: [], meta: {}, hashes: [], hash: '' };
  await scanDir(CONTENT_DIR, '', result);
  result.hash = sha1([...result.hashes].sort().join('|'));
  return result;
}

let cached: { hash: string; source: DocsSource } | undefined;

/**
 * Docs source compiled from the file system at request time.
 * Re-compiles only when content changes (hash of paths + file contents).
 */
export async function getDocsSource(): Promise<DocsSource> {
  const scan = await scanContent();
  if (cached?.hash === scan.hash) return cached.source;

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

  cached = { hash: scan.hash, source };
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
