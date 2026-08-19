import { isAdminRequest, unauthorized } from '@/lib/auth';

import { listContentFiles } from '../shared';

export const dynamic = 'force-dynamic';

/** File tree for the editor. Every .mdx/.md plus meta.json, admin-only. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  // The tree must always reflect disk state (create/delete round-trips).
  return Response.json({ files: await listContentFiles() }, {
    headers: { 'cache-control': 'no-store' },
  });
}
