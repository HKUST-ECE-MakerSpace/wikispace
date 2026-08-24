import { isAdminRequest } from '@/lib/auth';
import { getLLMText, getDocsSource } from '@/lib/source';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>,
) {
  const { slug } = await params;
  const source = await getDocsSource({ includeAdmin: isAdminRequest(request) });
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  // Cookie-personalized export (also serves the /docs/*.md rewrites) —
  // never cacheable by shared caches.
  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown',
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
}
