import { badRequest, sessionCookie, verifyPassword } from '@/lib/auth';
import { getSettings } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { password } = body;
  if (typeof password !== 'string' || password.length === 0) {
    return badRequest('password must be a non-empty string');
  }
  const settings = getSettings();
  if (!verifyPassword(password, settings.adminPasswordHash)) {
    return Response.json({ error: 'invalid password' }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', sessionCookie(settings.sessionSecret));
  return res;
}
