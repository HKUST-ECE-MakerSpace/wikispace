'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MachineState, MachineStatus } from '@/lib/types';
import { MACHINE_STATUSES, MACHINE_STATUS_LABELS } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

interface MachineFields {
  status: MachineStatus;
  statusNote: string;
  quantity: string;
}

function fieldsOf(machine: MachineState): MachineFields {
  return { status: machine.status, statusNote: machine.statusNote, quantity: machine.quantity };
}

function sameFields(a: MachineFields, b: MachineFields): boolean {
  return a.status === b.status && a.statusNote === b.statusNote && a.quantity === b.quantity;
}

function MachineCard({
  machine,
  onAuthLost,
  refresh,
}: {
  machine: MachineState;
  onAuthLost: () => void;
  refresh: () => Promise<void>;
}) {
  const server = fieldsOf(machine);
  const [synced, setSynced] = useState<MachineFields>(server);
  const [fields, setFields] = useState<MachineFields>(server);
  // Adopt server values when they change underneath (e.g. after our own save
  // or another admin's edit); local edits win until then.
  if (!sameFields(synced, server)) {
    setSynced(server);
    setFields(server);
  }

  const { run, state, error } = useAdminMutation(onAuthLost, refresh);
  const dirty = !sameFields(fields, server);

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {machine.icon}
          </span>
          <span className="font-semibold">{machine.name}</span>
        </div>
        <Link
          href={`/docs/machines/${machine.id}`}
          className="whitespace-nowrap text-sm text-fd-primary hover:underline"
        >
          Docs →
        </Link>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={fields.status}
            onChange={(e) => setFields({ ...fields, status: e.target.value as MachineStatus })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          >
            {MACHINE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MACHINE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Quantity
          <input
            placeholder='e.g. "1 of 2 working"'
            value={fields.quantity}
            onChange={(e) => setFields({ ...fields, quantity: e.target.value })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Status note
          <input
            placeholder="Shown next to the badge on the docs page"
            value={fields.statusNote}
            onChange={(e) => setFields({ ...fields, statusNote: e.target.value })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || state === 'saving'}
          onClick={() =>
            void run(`/api/ops/machines/${machine.id}`, 'PATCH', {
              status: fields.status,
              statusNote: fields.statusNote,
              quantity: fields.quantity,
            })
          }
          className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {saveLabel(state)}
        </button>
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}

/** Machines tab: live status editing, one card per machine. */
export function MachinesTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, error, refresh } = useOpsState();
  const machines = state?.machines ?? [];

  if (machines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        {error ? 'Live state unavailable — is the API running?' : 'No machines yet.'}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {machines.map((machine) => (
        <MachineCard key={machine.id} machine={machine} onAuthLost={onAuthLost} refresh={refresh} />
      ))}
    </div>
  );
}
