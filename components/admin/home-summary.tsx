'use client';

import Link from 'next/link';
import type { MachineStatus } from '@/lib/types';
import { MACHINE_STATUS_LABELS } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';

const DEFAULT_WELCOME_TITLE = 'ECE Makerspace';
const DEFAULT_WELCOME_MESSAGE =
  'Welcome to the ECE Makerspace wiki — check machine status, find parts, and report issues to keep the space running.';

const STATUS_DOTS: Record<MachineStatus, string> = {
  operational: 'bg-emerald-400',
  'needs-attention': 'bg-amber-400',
  down: 'bg-red-400',
  maintenance: 'bg-orange-400',
};

const QUICK_LINKS: { href: string; label: string }[] = [
  { href: '/docs/machines', label: 'Machines' },
  { href: '/docs/banks', label: 'Banks' },
  { href: '/docs/filament', label: 'Filament' },
  { href: '/docs/workshops', label: 'Workshops' },
  { href: '/docs/rules', label: 'Rules' },
  { href: '/admin', label: 'Admin' },
  { href: '/edit', label: 'Edit' },
];

/**
 * Client island for the home route: live welcome text, machine status
 * cards and quick links. Everything else on `/` is static.
 */
export function HomeSummary() {
  const { state, error } = useOpsState();
  const machines = state?.machines ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{state?.welcomeTitle ?? DEFAULT_WELCOME_TITLE}</h1>
      <p className="mt-2 max-w-2xl text-fd-muted-foreground">
        {state?.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:text-fd-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Machine status</h2>
      {error && machines.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
          Live status unavailable — is the API running?
        </div>
      ) : machines.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
          No machines yet.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {machines.map((machine) => (
            <Link
              key={machine.id}
              href={`/docs/machines/${machine.id}`}
              className="rounded-lg border border-fd-border bg-fd-card p-4 transition-colors hover:border-fd-primary/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {machine.icon}
                </span>
                <span className="font-semibold">{machine.name}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[machine.status]}`} />
                {MACHINE_STATUS_LABELS[machine.status]}
              </div>
              {machine.statusNote ? (
                <p className="mt-1 text-sm text-fd-muted-foreground">{machine.statusNote}</p>
              ) : null}
              {machine.quantity ? (
                <p className="mt-1 text-sm text-fd-muted-foreground">{machine.quantity}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
