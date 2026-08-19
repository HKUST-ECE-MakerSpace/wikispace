'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { MachineStatus } from '@/lib/types';
import { MACHINE_STATUS_LABELS } from '@/lib/types';
import { useOpsState } from './use-ops-state';

const STATUS_STYLES: Record<MachineStatus, string> = {
  operational: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30',
  'needs-attention': 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  down: 'bg-red-400/15 text-red-400 border-red-400/30',
  maintenance: 'bg-orange-400/15 text-orange-400 border-orange-400/30',
};

const STATUS_DOTS: Record<MachineStatus, string> = {
  operational: 'bg-emerald-400',
  'needs-attention': 'bg-amber-400',
  down: 'bg-red-400',
  maintenance: 'bg-orange-400',
};

/**
 * Live machine status badge for a machine docs page. Binds to the machine's
 * ops record by id; the docs page slug (`/docs/machines/<id>`) is the id.
 */
export function MachineStatusWidget({ id }: { id: string }) {
  const { state, error } = useOpsState();
  const [showQr, setShowQr] = useState(false);
  const machine = state?.machines.find((m) => m.id === id);

  if (error && !machine) {
    return (
      <div className="rounded-lg border border-fd-border px-3 py-2 text-sm text-fd-muted-foreground">
        Status unavailable — is the API running?
      </div>
    );
  }
  if (!machine) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-3 py-1.5 text-sm text-fd-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-fd-muted-foreground/50" />
        No status record for “{id}”
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-medium ${
          STATUS_STYLES[machine.status]
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[machine.status]}`} />
        {MACHINE_STATUS_LABELS[machine.status]}
      </span>
      {machine.statusNote ? (
        <span className="text-fd-muted-foreground">{machine.statusNote}</span>
      ) : null}
      {machine.quantity ? (
        <span className="text-fd-muted-foreground">· {machine.quantity}</span>
      ) : null}
      <button
        type="button"
        onClick={() => setShowQr((v) => !v)}
        aria-expanded={showQr}
        className="rounded-lg border border-fd-border px-2 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary hover:text-fd-primary"
      >
        {showQr ? 'Hide QR' : 'QR'}
      </button>
      {showQr ? (
        <div className="w-fit rounded-lg border border-fd-border bg-white p-3 shadow-sm">
          <QRCodeSVG value={window.location.href} size={128} />
          <div className="mt-1.5 text-center text-xs font-medium text-neutral-600">
            Scan for this page
          </div>
        </div>
      ) : null}
    </div>
  );
}
