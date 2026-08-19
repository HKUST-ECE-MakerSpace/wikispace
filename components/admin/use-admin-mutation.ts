'use client';

import { useCallback, useState } from 'react';
import { mutateOps } from '@/components/ops/use-ops-state';

export type MutationState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Shared save handler for admin mutations: routes 401s to the login gate,
 * decodes `{"error": ...}` bodies for display, and exposes per-control
 * feedback state (saving / saved ✓ / error).
 */
export function useAdminMutation(
  onAuthLost: () => void,
  onDone?: () => void | Promise<void>,
) {
  const [state, setState] = useState<MutationState>('idle');
  const [error, setError] = useState<string>();

  const run = useCallback(
    async (
      path: string,
      method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      body?: unknown,
    ): Promise<boolean> => {
      setState('saving');
      setError(undefined);
      try {
        const res = await mutateOps(path, method, body);
        if (res.status === 401) {
          onAuthLost();
          setState('idle');
          return false;
        }
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) detail = data.error;
          } catch {
            // non-JSON error body — keep the HTTP detail
          }
          setError(detail);
          setState('error');
          return false;
        }
        setState('saved');
        window.setTimeout(() => setState('idle'), 2000);
        if (onDone) await onDone();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState('error');
        return false;
      }
    },
    [onAuthLost, onDone],
  );

  return { run, state, error };
}

/** Small helper for save-button labels. */
export function saveLabel(state: MutationState, idle = 'Save'): string {
  if (state === 'saving') return 'Saving…';
  if (state === 'saved') return 'Saved ✓';
  return idle;
}
