import { cache } from 'react';
import { cookies } from 'next/headers';

import { isAdminContext, isAdminRequest, readCookie } from './auth';
import type { Access } from './source';

/**
 * Member-aware visibility for `access: members` pages.
 *
 * Two credentials qualify: the wiki's own admin session (`wiki_session`, see
 * `lib/auth.ts`), or a session with the accounts service at
 * `accounts.ecemaker.space`, which issues `ms_session` on `.ecemaker.space`.
 * The accounts service stores only `sha256(token)`, so the cookie cannot be
 * verified offline — every check is one loopback call to `GET /api/me` with
 * the cookie forwarded. A slow or unreachable accounts service is treated as
 * "not a member": restricted pages stay hidden rather than leaking.
 */

const MS_SESSION_COOKIE = 'ms_session';

/**
 * Where the accounts service answers. Fixed by the operator; never derived
 * from request input (that would be an SSRF hole), and defaults to the
 * loopback address the service binds in production. An empty value (a copied
 * `.env.example`) falls back to the default too.
 */
const ACCOUNTS_ORIGIN = (process.env.ACCOUNTS_ORIGIN || 'http://127.0.0.1:3100').replace(
  /\/+$/,
  '',
);

/** Kept short: a hanging accounts service must not hold a page render open. */
const ACCOUNTS_TIMEOUT_MS = 1_500;

/** Identity of a caller holding a verified accounts-service session. */
export interface MemberIdentity {
  /** ITSC login (lowercase as the accounts service reports it). */
  itsc: string;
  /** Display name, when the accounts service reports one. */
  name?: string;
  /** Whether the accounts service marks this member as an admin. */
  isAdmin: boolean;
}

/**
 * `PROCUREMENT_ITSCS` — comma-separated ITSC logins allowed to read
 * `access: members` pages. Empty means any authenticated member.
 */
function allowedItscs(): string[] {
  return (process.env.PROCUREMENT_ITSCS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Ask the accounts service who owns the `ms_session` cookie, or null. */
async function fetchMember(cookieHeader: string | null): Promise<MemberIdentity | null> {
  const token = readCookie(cookieHeader, MS_SESSION_COOKIE);
  if (!token) return null;
  try {
    const response = await fetch(`${ACCOUNTS_ORIGIN}/api/me`, {
      headers: { cookie: `${MS_SESSION_COOKIE}=${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(ACCOUNTS_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      itsc?: unknown;
      is_admin?: unknown;
      display_name?: unknown;
      user?: { itsc?: unknown; is_admin?: unknown; display_name?: unknown };
    };
    // The accounts service nests the identity under `user`; a flat body is
    // accepted too so a minimal identity endpoint can serve the same guard.
    const user = body.user ?? body;
    const { itsc } = user;
    if (typeof itsc !== 'string' || itsc.length === 0) return null;
    const allowed = allowedItscs();
    if (allowed.length > 0 && !allowed.includes(itsc.toLowerCase())) return null;
    return {
      itsc,
      name:
        typeof user.display_name === 'string' && user.display_name ? user.display_name : undefined,
      isAdmin: user.is_admin === true,
    };
  } catch {
    // Unreachable, timed out or non-JSON: fail closed.
    return null;
  }
}

/** Member identity behind a route-handler request, or null. */
export function memberRequest(request: Request): Promise<MemberIdentity | null> {
  return fetchMember(request.headers.get('cookie'));
}

/** Member identity behind the current server-component render, or null. */
export const memberContext = cache(
  async (): Promise<MemberIdentity | null> => fetchMember((await cookies()).toString()),
);

/** True when the caller may read `access: members` pages. */
export async function isPrivilegedRequest(request: Request): Promise<boolean> {
  if (isAdminRequest(request)) return true;
  return (await memberRequest(request)) !== null;
}

/**
 * Server-component twin of {@link isPrivilegedRequest}. The docs layout, the
 * docs page and `generateMetadata` all ask during one render; `React.cache`
 * collapses that to a single accounts lookup per request.
 */
export const isPrivilegedContext = cache(
  async (): Promise<boolean> => (await isAdminContext()) || (await memberContext()) !== null,
);

/**
 * Read level behind a route-handler request. Three tiers, because a wiki admin
 * must keep reading `access: admin` pages as well as `access: members` ones.
 */
export async function requestAccess(request: Request): Promise<Access> {
  if (isAdminRequest(request)) return 'admin';
  return (await isPrivilegedRequest(request)) ? 'members' : 'public';
}

/** Server-component twin of {@link requestAccess}, cached per request. */
export const contextAccess = cache(async (): Promise<Access> => {
  if (await isAdminContext()) return 'admin';
  return (await isPrivilegedContext()) ? 'members' : 'public';
});
