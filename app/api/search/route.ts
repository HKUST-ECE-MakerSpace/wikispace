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
const { GET: search } = createFromSource(async () =>
  getDocsSource({ includeAdmin: await isAdminContext() }),
);

/**
 * The index is cookie-personalized, so the response must never be stored by
 * a shared cache (an edge cache keying only on the URL would hand the admin
 * index to anonymous users) and must revalidate per cookie.
 */
export async function GET(request: Request) {
  const response = await search(request);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  return response;
}
