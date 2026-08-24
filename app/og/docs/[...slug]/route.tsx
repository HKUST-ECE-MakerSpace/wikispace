import { isAdminRequest } from '@/lib/auth';
import { getDocsSource } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { appName } from '@/lib/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: RouteContext<'/og/docs/[...slug]'>,
) {
  const { slug } = await params;
  const source = await getDocsSource({ includeAdmin: isAdminRequest(request) });
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  // next/og defaults to `Cache-Control: public` — the image is
  // cookie-personalized (page title/description), so override to private.
  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site={appName} />,
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    },
  );
}
