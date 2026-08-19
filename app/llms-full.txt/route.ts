import { getLLMText, getDocsSource } from '@/lib/source';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = await getDocsSource();
  const scanned = await Promise.all(source.getPages().map(getLLMText));
  return new Response(scanned.join('\n\n'));
}
