import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import { getSettings } from './store';

export const SESSION_COOKIE = 'wiki_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/* ---------------------------------- passwords --------------------------------- */

/** Hash a password as `scrypt:<saltHex>:<hashHex>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Constant-time verification against a `scrypt:<saltHex>:<hashHex>` string. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* ---------------------------------- sessions ---------------------------------- */

function signExpiry(exp: string, secret: string): string {
  return createHmac('sha256', secret).update(exp).digest('hex');
}

/** Session cookie value: `${exp}.${hmacSha256(exp, sessionSecret)}`. */
export function createSessionValue(sessionSecret: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${signExpiry(String(exp), sessionSecret)}`;
}

/** Verify a session cookie value: signature must match and not be expired. */
export function verifySessionValue(value: string, sessionSecret: string): boolean {
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(exp) <= Math.floor(Date.now() / 1000)) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(signExpiry(exp, sessionSecret), 'hex'));
  } catch {
    return false;
  }
}

function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) return part.slice(eq + 1).trim();
  }
  return null;
}

/** True when the request carries a valid, unexpired admin session cookie. */
export function isAdminRequest(request: Request): boolean {
  const value = readSessionCookie(request);
  if (!value) return false;
  return verifySessionValue(value, getSettings().sessionSecret);
}

/**
 * True when the current server-component render carries a valid, unexpired
 * admin session. The `next/headers` cookie store is only readable inside a
 * request scope — use {@link isAdminRequest} in route handlers, which own a
 * `Request` directly.
 */
export async function isAdminContext(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value !== undefined && verifySessionValue(value, getSettings().sessionSecret);
}

/** Full `Set-Cookie` value for a fresh admin session. */
export function sessionCookie(sessionSecret: string): string {
  const attrs = [
    `${SESSION_COOKIE}=${createSessionValue(sessionSecret)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  return attrs.join('; ');
}

/** Expired `Set-Cookie` value that clears the admin session. */
export function clearedSessionCookie(): string {
  const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  return attrs.join('; ');
}

/* ---------------------------------- responses ---------------------------------- */

export const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });
