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
  // Bank hits come from the drawer index / grid contents — carry the query so
  // the page can highlight the matching drawer on the grid (?q=).
  const query = new URL(request.url).searchParams.get('query')?.trim();
  if (query && (response.headers.get('content-type') ?? '').includes('json')) {
    const results = (await response.json().catch(() => null)) as { url?: unknown }[] | null;
    if (Array.isArray(results)) {
      for (const result of results) {
        if (typeof result?.url === 'string' && /^\/docs\/banks\/[^/?#]+/.test(result.url)) {
          // insert ?q= before any #heading anchor so it reaches location.search
          const url = new URL(result.url, 'http://localhost');
          url.searchParams.set('q', query);
          result.url = url.pathname + url.search + url.hash;
        }
      }
      return Response.json(results, { status: response.status, headers: response.headers });
    }
  }
  return response;
}
