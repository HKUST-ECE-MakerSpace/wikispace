import { isAdminRequest } from '@/lib/auth';
import { getLLMText, getDocsSource } from '@/lib/source';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const source = await getDocsSource({ includeAdmin: isAdminRequest(request) });
  const scanned = await Promise.all(source.getPages().map(getLLMText));
  return new Response(scanned.join('\n\n'));
}
