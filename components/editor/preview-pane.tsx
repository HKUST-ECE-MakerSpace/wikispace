'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** The editor's auth-aware fetch wrapper (401 handling lives there). */
export type ApiFetch = (url: string, init?: RequestInit) => Promise<Response>;

interface PreviewPaneProps {
  path: string;
  content: string;
  /**
   * True while a markdown file is open and the preview is enabled. Going false
   * cleans the invisible server-side draft up.
   */
  active: boolean;
  api: ApiFetch;
}

const DEBOUNCE_MS = 700;

/**
 * Right-hand pane of the editor: debounces the buffer to
 * POST /api/content/preview and reloads an iframe on every returned url. The
 * draft is excluded from the public sidebar and search.
 */
export function PreviewPane({ path, content, active, api }: PreviewPaneProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  // Only the newest debounce cycle may touch state — responses can land out
  // of order when typing fast.
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!active) return;
    setPending(true);
    setError('');
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      api('/api/content/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error ?? `Preview failed (${response.status})`);
          }
          return (await response.json()) as { url: string };
        })
        .then((data) => {
          if (requestSeq.current !== seq) return;
          setUrl(data.url);
          setPending(false);
        })
        .catch((cause: unknown) => {
          if (requestSeq.current !== seq) return;
          setError(cause instanceof Error ? cause.message : 'Preview failed');
          setPending(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [active, api, content]);

  // Remove the server-side draft when the pane is closed or the file goes
  // away — and on pagehide, since React cleanup never runs on navigation.
  useEffect(() => {
    if (!active) return;
    const cleanup = (): void => {
      void api('/api/content/preview', { method: 'DELETE', keepalive: true }).catch(
        () => undefined,
      );
    };
    window.addEventListener('pagehide', cleanup);
    return () => {
      window.removeEventListener('pagehide', cleanup);
      cleanup();
    };
  }, [active, api]);

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-fd-border px-3 py-2">
        <h2 className="text-sm font-semibold">Preview</h2>
        <span className="min-w-0 truncate font-mono text-xs text-fd-muted-foreground">
          {path}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-fd-muted-foreground">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : pending ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Rendering…
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </>
          )}
        </span>
      </div>
      <div className="min-h-0 flex-1 bg-fd-background">
        {url === null ? (
          <div className="flex h-full items-center justify-center gap-2 px-6 text-center text-sm text-fd-muted-foreground">
            {!error && <Loader2 className="size-4 shrink-0 animate-spin" />}
            {error ? 'Preview unavailable' : 'Preparing preview…'}
          </div>
        ) : (
          <iframe
            key={url}
            src={url}
            title="Live preview of the page being edited"
            className="size-full border-0"
          />
        )}
      </div>
    </aside>
  );
}
