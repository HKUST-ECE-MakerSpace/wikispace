'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpsState } from '@/lib/types';

interface UseOpsStateResult {
  state: OpsState | undefined;
  error: string | undefined;
  refresh: () => Promise<void>;
}

/**
 * Polls the ops state endpoint. The wiki favours simple polling over
 * websockets: a few seconds of staleness is fine for a lab dashboard and
 * there is no socket infrastructure to break.
 */
export function useOpsState(intervalMs: number = 5000): UseOpsStateResult {
  const [state, setState] = useState<OpsState>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState((await res.json()) as OpsState);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { state, error, refresh };
}

export async function mutateOps(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<Response> {
  return fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
