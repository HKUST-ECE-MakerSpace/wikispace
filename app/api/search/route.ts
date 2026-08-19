import { getDocsSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const dynamic = 'force-dynamic';

/**
 * The loader function is cached by fumadocs: the search index is rebuilt only
 * when `getDocsSource()` returns a new source object (content changed).
 */
export const { GET } = createFromSource(async () => await getDocsSource());
