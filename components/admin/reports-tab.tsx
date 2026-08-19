'use client';

import { useState } from 'react';
import type { Report, ReportStatus } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

const REPORT_STATUSES: ReportStatus[] = ['open', 'in-progress', 'resolved'];

const STATUS_BADGES: Record<ReportStatus, string> = {
  open: 'border-red-400/30 bg-red-400/15 text-red-400',
  'in-progress': 'border-amber-400/30 bg-amber-400/15 text-amber-400',
  resolved: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400',
};

function ReportCard({
  report,
  onAuthLost,
  refresh,
}: {
  report: Report;
  onAuthLost: () => void;
  refresh: () => Promise<void>;
}) {
  const server = { status: report.status, adminNotes: report.adminNotes };
  const [synced, setSynced] = useState(server);
  const [fields, setFields] = useState(server);
  // Adopt server values when they change underneath; local edits win until then.
  if (synced.status !== server.status || synced.adminNotes !== server.adminNotes) {
    setSynced(server);
    setFields(server);
  }

  const { run, state, error } = useAdminMutation(onAuthLost, refresh);
  const when = new Date(report.createdAt);
  const dirty = fields.status !== server.status || fields.adminNotes !== server.adminNotes;

  async function remove() {
    if (!window.confirm(`Delete report from ${report.reportedBy}?`)) return;
    await run(`/api/ops/reports/${report.id}`, 'DELETE');
  }

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{report.machineName}</span>
        <span className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground">
          {report.issueType}
        </span>
        <span
          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[fields.status]}`}
        >
          {fields.status}
        </span>
        <span className="ml-auto text-xs text-fd-muted-foreground">
          {report.reportedBy} ·{' '}
          {Number.isNaN(when.getTime()) ? report.createdAt : when.toLocaleString()}
        </span>
      </div>

      {report.description ? (
        <p className="mt-2 text-sm text-fd-muted-foreground">{report.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={fields.status}
            onChange={(e) => setFields({ ...fields, status: e.target.value as ReportStatus })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          >
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
          Admin notes
          <input
            placeholder="Visible to other admins"
            value={fields.adminNotes}
            onChange={(e) => setFields({ ...fields, adminNotes: e.target.value })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          />
        </label>
        <button
          type="button"
          disabled={!dirty || state === 'saving'}
          onClick={() =>
            void run(`/api/ops/reports/${report.id}`, 'PATCH', { ...fields })
          }
          className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {saveLabel(state)}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          className="rounded-md border border-red-400/40 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-400/10"
        >
          Delete
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

/** Reports tab, newest first. */
export function ReportsTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, error, refresh } = useOpsState();
  const reports = [...(state?.reports ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        {error ? 'Live state unavailable — is the API running?' : 'No reports yet.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} onAuthLost={onAuthLost} refresh={refresh} />
      ))}
    </div>
  );
}
