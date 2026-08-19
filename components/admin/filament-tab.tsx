'use client';

import { useEffect, useState } from 'react';
import type { FilamentItem } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

/** Editable row: colors are a comma-joined string while editing. */
interface FilamentRow {
  id: string;
  material: string;
  brand: string;
  size: string;
  colors: string;
  quantity: number;
}

function rowsOf(items: FilamentItem[]): FilamentRow[] {
  return items.map((item) => ({
    id: item.id,
    material: item.material,
    brand: item.brand,
    size: item.size,
    colors: item.colors.join(', '),
    quantity: item.quantity,
  }));
}

/** Filament tab: whole-table editor with one save-all PUT. */
export function FilamentTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, refresh } = useOpsState();
  const { run, state: saveState, error } = useAdminMutation(onAuthLost, refresh);
  const [rows, setRows] = useState<FilamentRow[]>();
  const [dirty, setDirty] = useState(false);

  // Adopt server rows until the admin starts editing; after a successful
  // save (dirty flips back) the fresh server copy is adopted again.
  useEffect(() => {
    const items = state?.filament;
    if (!items) return;
    setRows((prev) => (prev === undefined || !dirty ? rowsOf(items) : prev));
  }, [state?.filament, dirty]);

  if (!rows) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        Loading filament inventory…
      </div>
    );
  }

  // const alias so the handlers below see the narrowed (non-undefined) rows
  const current = rows;

  function update(index: number, patch: Partial<FilamentRow>) {
    setRows(current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  }

  /** Functional update so rapid clicks never read a stale row. */
  function stepQuantity(index: number, delta: number) {
    setRows((prev) => (prev ?? []).map((row, i) => (i === index ? { ...row, quantity: row.quantity + delta } : row)));
    setDirty(true);
  }

  function addRow() {
    setRows([...current, { id: '', material: '', brand: '', size: '', colors: '', quantity: 0 }]);
    setDirty(true);
  }

  async function saveAll() {
    const items: FilamentItem[] = current.map((row) => ({
      id: row.id,
      material: row.material,
      brand: row.brand,
      size: row.size,
      colors: row.colors
        .split(',')
        .map((color) => color.trim())
        .filter(Boolean),
      quantity: row.quantity,
    }));
    const ok = await run('/api/ops/filament', 'PUT', { items });
    if (ok) setDirty(false);
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-fd-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fd-card text-left">
              <th className="border-b border-fd-border px-2 py-1.5 font-medium">Material</th>
              <th className="border-b border-fd-border px-2 py-1.5 font-medium">Brand</th>
              <th className="border-b border-fd-border px-2 py-1.5 font-medium">Size</th>
              <th className="border-b border-fd-border px-2 py-1.5 font-medium">Colors</th>
              <th className="border-b border-fd-border px-2 py-1.5 font-medium">Quantity</th>
              <th className="border-b border-fd-border px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border-b border-fd-border/60 px-2 py-1.5">
                  <input
                    value={row.material}
                    onChange={(e) => update(index, { material: e.target.value })}
                    className="w-24 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                  />
                </td>
                <td className="border-b border-fd-border/60 px-2 py-1.5">
                  <input
                    value={row.brand}
                    onChange={(e) => update(index, { brand: e.target.value })}
                    className="w-24 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                  />
                </td>
                <td className="border-b border-fd-border/60 px-2 py-1.5">
                  <input
                    value={row.size}
                    onChange={(e) => update(index, { size: e.target.value })}
                    className="w-20 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                  />
                </td>
                <td className="border-b border-fd-border/60 px-2 py-1.5">
                  <input
                    placeholder="red, black, white"
                    value={row.colors}
                    onChange={(e) => update(index, { colors: e.target.value })}
                    className="w-44 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                  />
                </td>
                <td className="border-b border-fd-border/60 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => stepQuantity(index, -1)}
                      className="h-7 w-7 rounded-md border border-fd-border font-medium text-fd-muted-foreground hover:text-fd-primary"
                    >
                      −
                    </button>
                    <span className="w-8 text-center tabular-nums">{row.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => stepQuantity(index, 1)}
                      className="h-7 w-7 rounded-md border border-fd-border font-medium text-fd-muted-foreground hover:text-fd-primary"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="border-b border-fd-border/60 px-2 py-1.5 text-right">
                  <button
                    type="button"
                    aria-label="Delete row"
                    onClick={() => {
                      setRows(rows.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                    className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-400/10"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground hover:text-fd-primary"
        >
          + Add row
        </button>
        <button
          type="button"
          disabled={!dirty || saveState === 'saving'}
          onClick={() => void saveAll()}
          className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {saveLabel(saveState, 'Save all')}
        </button>
        {dirty && saveState !== 'saving' ? (
          <span className="text-sm text-amber-400">Unsaved changes</span>
        ) : null}
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
