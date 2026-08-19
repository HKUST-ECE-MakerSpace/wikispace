import { clearedSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', clearedSessionCookie());
  return res;
}
