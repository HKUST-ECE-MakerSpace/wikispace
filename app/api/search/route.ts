import { isAdminContext } from '@/lib/auth';
import { getDocsSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const dynamic = 'force-dynamic';

/**
 * The loader runs while GET is handling a request, so the cookie store is
 * readable. It is cached by fumadocs per returned source object: admin
 * sessions get the variant including `admin: true` pages, cached separately
 * from the public index.
 */
export const { GET } = createFromSource(async () =>
  getDocsSource({ includeAdmin: await isAdminContext() }),
);
