'use client';

import { useState } from 'react';
import type { FilamentItem } from '@/lib/types';
import { mutateOps, useOpsState } from './use-ops-state';

function FilamentRequestForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ requesterName: '', material: '', note: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    const res = await mutateOps('/api/ops/requests', 'POST', {
      componentName: `Filament: ${form.material || 'any'}`,
      componentType: 'filament',
      quantity: '1',
      requesterName: form.requesterName,
      reason: form.note,
    });
    setStatus(res.ok ? 'sent' : 'error');
    if (res.ok) setTimeout(onDone, 1200);
  }

  return (
    <form
      onSubmit={submit}
      className="not-prose mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-fd-border p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        Your name
        <input
          required
          value={form.requesterName}
          onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
          className="rounded-md border border-fd-border bg-fd-card px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Material
        <input
          placeholder="e.g. PLA, TPU 95A"
          value={form.material}
          onChange={(e) => setForm({ ...form, material: e.target.value })}
          className="rounded-md border border-fd-border bg-fd-card px-2 py-1"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Note
        <input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="rounded-md border border-fd-border bg-fd-card px-2 py-1"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
      >
        {status === 'sent' ? 'Requested ✓' : status === 'sending' ? 'Sending…' : 'Request'}
      </button>
      {status === 'error' ? (
        <span className="text-sm text-red-400">Failed — try again</span>
      ) : null}
    </form>
  );
}

/** Filament inventory: read-only for members, with a request flow. */
export function FilamentWidget() {
  const { state } = useOpsState();
  const [showForm, setShowForm] = useState(false);
  const items = state?.filament ?? [];

  return (
    <div className="not-prose">
      {showForm ? (
        <FilamentRequestForm onDone={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium"
        >
          Request filament
        </button>
      )}
      <div className="overflow-x-auto rounded-lg border border-fd-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fd-card">
              {['Material', 'Brand', 'Size', 'Colours', 'Stock'].map((h) => (
                <th key={h} className="border-b border-fd-border px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: FilamentItem) => (
              <tr key={item.id} className="border-b border-fd-border/60">
                <td className="px-3 py-2 font-medium">{item.material}</td>
                <td className="px-3 py-2">{item.brand}</td>
                <td className="px-3 py-2">{item.size}</td>
                <td className="px-3 py-2">{item.colors.join(', ')}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      item.quantity <= 2 ? 'font-semibold text-amber-400' : undefined
                    }
                  >
                    {item.quantity} roll{item.quantity === 1 ? '' : 's'}
                    {item.quantity <= 2 ? ' · low' : ''}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-fd-muted-foreground">
                  No filament records.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
