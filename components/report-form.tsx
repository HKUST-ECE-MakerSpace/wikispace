'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';

import type { MachineState } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';

const ISSUE_TYPES = [
  'Broken / not working',
  'Prints badly',
  'Missing material or part',
  'Needs maintenance',
  'Something else',
] as const;

interface SubmittedReport {
  machineName: string;
}

/**
 * Public issue-report form (no login — members report issues on the spot).
 * Posts to the public reports endpoint; the machine gets flagged
 * "needs-attention" and exco gets a WhatsApp ping automatically.
 */
export function ReportForm() {
  const { state } = useOpsState();
  const searchParams = useSearchParams();
  const machines: MachineState[] = state?.machines ?? [];
  const preselected = searchParams.get('machine') ?? '';

  const [machineId, setMachineId] = useState(preselected);
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0]);
  const [reportedBy, setReportedBy] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<SubmittedReport>();

  useEffect(() => {
    if (!machineId && preselected && machines.some((m) => m.id === preselected)) {
      setMachineId(preselected);
    }
  }, [machineId, preselected, machines]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!machineId) {
      setError('Pick which machine has the problem.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch('/api/ops/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId, issueType, reportedBy, description }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? `HTTP ${res.status}`);
      }
      const report = (await res.json()) as { machineName: string };
      setDone({ machineName: report.machineName });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-fd-border bg-fd-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TriangleAlert className="size-5 text-amber-400" />
          Reported. Thanks!
        </h2>
        <p className="mt-2 text-fd-muted-foreground">
          {done.machineName} is now flagged <strong>Needs Attention</strong> and exco has been
          notified. It stays flagged until someone resolves the report.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground hover:text-fd-primary"
          >
            ← Back home
          </Link>
          <Link
            href="/docs/machines"
            className="rounded-lg bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground"
          >
            Machine docs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-fd-border bg-fd-card p-6"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Which machine?</span>
        <select
          required
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="rounded-lg border border-fd-border bg-fd-background px-3 py-2"
        >
          <option value="" disabled>
            Pick a machine…
          </option>
          {machines.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machine.icon} {machine.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">What's wrong?</span>
        <select
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          className="rounded-lg border border-fd-border bg-fd-background px-3 py-2"
        >
          {ISSUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Your name</span>
        <input
          required
          value={reportedBy}
          onChange={(e) => setReportedBy(e.target.value)}
          placeholder="So exco can follow up"
          className="rounded-lg border border-fd-border bg-fd-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Details (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What happened? Any error messages?"
          className="resize-y rounded-lg border border-fd-border bg-fd-background px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={busy || machines.length === 0}
        className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-semibold text-fd-primary-foreground disabled:opacity-50"
      >
        {busy ? 'Sending…' : machines.length === 0 ? 'Loading machines…' : 'Report issue'}
      </button>
      <p className="text-xs text-fd-muted-foreground">
        No login needed. The machine gets flagged for exco immediately.
      </p>
    </form>
  );
}
