'use client';

import { useState } from 'react';
import { mutateOps, useOpsState } from '@/components/ops/use-ops-state';
import { useAdminMutation } from './use-admin-mutation';

/** Backup tab: download a full JSON snapshot, restore one from disk. */
export function BackupTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { refresh } = useOpsState();
  const { run, state, error } = useAdminMutation(onAuthLost, refresh);
  const [downloadError, setDownloadError] = useState<string>();
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const res = await fetch('/api/ops/backup');
      if (res.status === 401) {
        onAuthLost();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename =
        match?.[1] ?? `makerspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(await res.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : String(e));
    }
    setDownloading(false);
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setDownloadError(`${file.name} is not valid JSON.`);
      return;
    }
    await run('/api/ops/backup', 'POST', data);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-fd-border bg-fd-card p-4">
        <h2 className="font-semibold">Download backup</h2>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          Full snapshot of machines, reports, requests, filament, banks and settings as JSON.
        </p>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void download()}
          className="mt-3 rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {downloading ? 'Downloading…' : 'Download backup'}
        </button>
        {downloadError ? <p className="mt-2 text-sm text-red-400">{downloadError}</p> : null}
      </section>

      <section className="rounded-lg border border-fd-border bg-fd-card p-4">
        <h2 className="font-semibold">Import backup</h2>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          Restores a previously downloaded backup. This overwrites all current ops data.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground hover:border-fd-primary/40 hover:text-fd-primary">
          {state === 'saving' ? 'Importing…' : state === 'saved' ? 'Imported ✓' : 'Choose file…'}
          <input
            type="file"
            accept="application/json,.json"
            disabled={state === 'saving'}
            onChange={(e) => void importFile(e)}
            className="hidden"
          />
        </label>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>
    </div>
  );
}
