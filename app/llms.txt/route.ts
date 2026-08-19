import { getDocsSource } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = await getDocsSource();
  return new Response(llms(source).index());
}
