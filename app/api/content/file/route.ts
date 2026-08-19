import { promises as fs } from 'node:fs';
import path from 'node:path';

import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';

import { ContentPathError, CONTENT_DIR, resolveContentPath } from '../shared';

export const dynamic = 'force-dynamic';

const missing = () => Response.json({ error: 'not found' }, { status: 404 });

async function readBody(request: Request): Promise<{ path: string; content: string }> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ContentPathError('body must be JSON');
  }
  const { path: filePath, content } = (parsed ?? {}) as Record<string, unknown>;
  if (typeof filePath !== 'string' || typeof content !== 'string') {
    throw new ContentPathError('body must be { path: string, content: string }');
  }
  return { path: filePath, content };
}

/**
 * Atomic write: land the bytes in a sibling temp file (ignored by the docs
 * scanner), then rename over the target so readers never see a half write.
 */
async function writeAtomic(absolute: string, content: string): Promise<void> {
  const temp = `${absolute}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, content, 'utf8');
  await fs.rename(temp, absolute);
}

/** Remove now-empty directories left behind by a deleted file. */
async function pruneEmptyDirs(start: string): Promise<void> {
  let dir = path.dirname(start);
  while (dir !== CONTENT_DIR && dir.length > CONTENT_DIR.length) {
    try {
      await fs.rmdir(dir);
    } catch {
      return; // not empty (or gone) — nothing more to prune
    }
    dir = path.dirname(dir);
  }
}

/** Raw text of one editable file. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  const relative = new URL(request.url).searchParams.get('path');
  let absolute: string;
  try {
    absolute = resolveContentPath(relative);
  } catch (error) {
    return badRequest((error as ContentPathError).message);
  }

  try {
    return Response.json({ content: await fs.readFile(absolute, 'utf8') });
  } catch {
    return missing();
  }
}

/** Overwrite an existing file atomically. */
export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  let body: { path: string; content: string };
  let absolute: string;
  try {
    body = await readBody(request);
    absolute = resolveContentPath(body.path);
  } catch (error) {
    return badRequest((error as ContentPathError).message);
  }

  try {
    await fs.access(absolute);
  } catch {
    return missing();
  }
  await writeAtomic(absolute, body.content);
  return Response.json({ ok: true });
}

/** Create a new file (parents are created as needed). */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  let body: { path: string; content: string };
  let absolute: string;
  try {
    body = await readBody(request);
    absolute = resolveContentPath(body.path);
  } catch (error) {
    return badRequest((error as ContentPathError).message);
  }

  try {
    await fs.access(absolute);
    return Response.json({ error: `${body.path} already exists` }, { status: 409 });
  } catch {
    // not there yet — create below
  }
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await writeAtomic(absolute, body.content);
  return Response.json({ ok: true }, { status: 201 });
}

/** Delete a file (never meta.json) and prune empty parent folders. */
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  const relative = new URL(request.url).searchParams.get('path');
  let absolute: string;
  try {
    absolute = resolveContentPath(relative);
  } catch (error) {
    return badRequest((error as ContentPathError).message);
  }

  if (path.basename(absolute) === 'meta.json') {
    return badRequest('refusing to delete meta.json');
  }

  try {
    await fs.unlink(absolute);
  } catch {
    return missing();
  }
  await pruneEmptyDirs(absolute);
  return Response.json({ ok: true });
}
