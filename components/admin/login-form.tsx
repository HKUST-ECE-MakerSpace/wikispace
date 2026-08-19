'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Compact password gate for /admin. Posts to the cookie-session endpoint;
 * the parent decides what happens on success (re-check session).
 */
export function LoginForm({
  onSuccess,
  notice,
}: {
  onSuccess: () => void;
  notice?: string;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword('');
        onSuccess();
      } else if (res.status === 401) {
        setError('Incorrect password.');
      } else {
        setError(`Login failed (HTTP ${res.status}).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-lg border border-fd-border bg-fd-card p-6"
    >
      <h1 className="text-xl font-bold">🔑 Admin login</h1>
      {notice ? <p className="text-sm text-amber-400">{notice}</p> : null}
      <input
        type="password"
        required
        autoFocus
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
      >
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <Link
        href="/"
        className="text-center text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
      >
        ← Back to home
      </Link>
    </form>
  );
}
