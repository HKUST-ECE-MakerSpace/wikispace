import { promises as fs } from 'node:fs';
import path from 'node:path';

import { isAdminRequest, unauthorized } from '@/lib/auth';
import { CONTENT_DIR } from '@/app/api/content/shared';
import { PREVIEW_FILE } from '@/lib/source';

export const dynamic = 'force-dynamic';

/** Server-fixed draft location — never derived from user input. */
const DRAFT_ABS = path.join(CONTENT_DIR, PREVIEW_FILE);

/**
 * Live-preview support for the editor: stash the in-progress MDX in a hidden
 * draft file (excluded from the public scanner) and point an iframe at
 * /preview. DELETE cleans the draft up when the editor closes.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  if (!body || typeof body.content !== 'string') {
    return Response.json({ error: 'content must be a string' }, { status: 400 });
  }

  const tmp = `${DRAFT_ABS}.tmp`;
  await fs.writeFile(tmp, body.content, 'utf8');
  await fs.rename(tmp, DRAFT_ABS);
  return Response.json({ url: `/preview?v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  await fs.rm(DRAFT_ABS, { force: true });
  return Response.json({ ok: true });
}
