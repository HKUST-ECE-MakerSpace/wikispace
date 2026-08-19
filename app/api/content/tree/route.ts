import { isAdminRequest, unauthorized } from '@/lib/auth';

import { listContentFiles } from '../shared';

export const dynamic = 'force-dynamic';

/** File tree for the editor. Every .mdx/.md plus meta.json, admin-only. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  return Response.json({ files: await listContentFiles() });
}
