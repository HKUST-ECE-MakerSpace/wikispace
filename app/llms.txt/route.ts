import { getDocsSource } from '@/lib/source';
import { requestAccess } from '@/lib/visibility';
import { llms } from 'fumadocs-core/source';

export const dynamic = 'force-dynamic';

/** Cookie-personalized index — never cacheable by shared caches. */
export async function GET(request: Request) {
  const source = await getDocsSource({
    visibility: await requestAccess(request),
  });
  return new Response(llms(source).index(), {
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
