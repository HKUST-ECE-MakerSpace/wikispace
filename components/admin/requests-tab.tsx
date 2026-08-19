'use client';

import { useState } from 'react';
import type { ComponentRequest, RequestStatus } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

const REQUEST_STATUSES: RequestStatus[] = ['pending', 'ordered', 'fulfilled', 'denied'];

const STATUS_BADGES: Record<RequestStatus, string> = {
  pending: 'border-amber-400/30 bg-amber-400/15 text-amber-400',
  ordered: 'border-blue-400/30 bg-blue-400/15 text-blue-400',
  fulfilled: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400',
  denied: 'border-red-400/30 bg-red-400/15 text-red-400',
};

function RequestCard({
  request,
  onAuthLost,
  refresh,
}: {
  request: ComponentRequest;
  onAuthLost: () => void;
  refresh: () => Promise<void>;
}) {
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [synced, setSynced] = useState(request.status);
  if (request.status !== synced) {
    setSynced(request.status);
    setStatus(request.status);
  }

  const { run, state, error } = useAdminMutation(onAuthLost, refresh);
  const when = new Date(request.createdAt);

  async function remove() {
    if (!window.confirm(`Delete request for ${request.componentName}?`)) return;
    await run(`/api/ops/requests/${request.id}`, 'DELETE');
  }

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{request.componentName}</span>
        <span className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground">
          {request.componentType}
        </span>
        <span className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground">
          ×{request.quantity}
        </span>
        <span
          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[status]}`}
        >
          {status}
        </span>
        <span className="ml-auto text-xs text-fd-muted-foreground">
          {request.requesterName} ·{' '}
          {Number.isNaN(when.getTime()) ? request.createdAt : when.toLocaleString()}
        </span>
      </div>

      {request.reason ? (
        <p className="mt-2 text-sm text-fd-muted-foreground">{request.reason}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus)}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={status === request.status || state === 'saving'}
          onClick={() => void run(`/api/ops/requests/${request.id}`, 'PATCH', { status })}
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

/** Component requests tab, newest first. */
export function RequestsTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, error, refresh } = useOpsState();
  const requests = [...(state?.requests ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        {error ? 'Live state unavailable — is the API running?' : 'No component requests yet.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} onAuthLost={onAuthLost} refresh={refresh} />
      ))}
    </div>
  );
}
