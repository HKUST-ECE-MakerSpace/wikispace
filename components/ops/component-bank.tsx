'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize2, Minimize2, PackageOpen, Search, X } from 'lucide-react';

import type { BankPage, Grid, GridCell } from '@/lib/types';
import { mutateOps, useOpsState } from './use-ops-state';

function cellKey(col: string, row: number): string {
  return `${col}${row}`;
}

/** A labelled drawer plus the unlabelled slots it swallows below it. */
interface CellRegion {
  col: string;
  row: number;
  span: number;
  cell: GridCell;
}

type Slot = { kind: 'start'; region: CellRegion } | { kind: 'skip' } | { kind: 'empty' };

/**
 * Merge rule, matching the physical banks: a labelled drawer claims the
 * unlabelled slots below it in the same column until the next labelled
 * cell or the bottom of the bank — one merged cell per physical bin.
 */
function buildSlots(grid: Grid, col: string, rows: number[]): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cell = grid.cells[cellKey(col, rows[i])];
    if (cell && cell.label) {
      let span = 1;
      for (let j = i + 1; j < rows.length; j++) {
        const below = grid.cells[cellKey(col, rows[j])];
        if (below && below.label) break;
        span++;
      }
      const region: CellRegion = { col, row: rows[i], span, cell };
      slots.push({ kind: 'start', region });
      for (let k = 1; k < span; k++) slots.push({ kind: 'skip' });
      i += span - 1;
    } else {
      slots.push({ kind: 'empty' });
    }
  }
  return slots;
}

/** Columns with no labelled drawers at all — physical aisles between bank sections. */
function gapColumns(grid: Grid, rows: number[]): Set<string> {
  const gaps = new Set<string>();
  for (const col of grid.columns) {
    if (!rows.some((row) => grid.cells[cellKey(col, row)]?.label)) gaps.add(col);
  }
  return gaps;
}

function cellText(cell: GridCell): string {
  return [
    cell.label,
    cell.description,
    ...(cell.items?.flatMap((item) => [item.name, item.contents]) ?? []),
  ].join(' ');
}

function matches(cell: GridCell | undefined, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle || !cell || !cell.label) return false;
  return cellText(cell).toLowerCase().includes(needle);
}

/** Unique searchable options for the request form: drawer labels + item names. */
function bankCatalog(bank: BankPage): string[] {
  const names = new Set<string>();
  for (const cell of Object.values(bank.grid.cells)) {
    if (cell.label) names.add(cell.label);
    for (const item of cell.items ?? []) {
      if (item.name) names.add(item.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function CellBody({ cell }: { cell: GridCell }) {
  const hasDetail = Boolean(cell.description) || (cell.items?.length ?? 0) > 0;
  if (!hasDetail) return <>{cell.label}</>;
  return (
    <div className="leading-tight">
      <div>{cell.label}</div>
      {cell.description ? (
        <div className="text-xs text-fd-muted-foreground">{cell.description}</div>
      ) : null}
      {cell.items?.map((item) => (
        <div key={item.name} className="text-xs text-fd-muted-foreground">
          {item.name}: {item.contents}
        </div>
      ))}
    </div>
  );
}

interface BankGridProps {
  bank: BankPage;
  query: string;
  registerCell: (key: string, el: HTMLTableCellElement | null) => void;
}

function BankGrid({ bank, query, registerCell }: BankGridProps) {
  const { columns, rowRange, thickRows, cells } = bank.grid;
  const [startRow, endRow] = rowRange;
  const rows = useMemo(
    () => Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i),
    [startRow, endRow],
  );
  const slotsByColumn = useMemo(
    () => Object.fromEntries(columns.map((col) => [col, buildSlots(bank.grid, col, rows)])),
    [bank.grid, columns, rows],
  );
  const gaps = useMemo(() => gapColumns(bank.grid, rows), [bank.grid, rows]);
  const searching = query.trim().length > 0;

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 border border-fd-border bg-fd-card px-2 py-1 text-center text-xs font-medium" />
            {columns.map((col) => (
              <th
                key={col}
                className={`sticky top-0 z-20 border border-fd-border bg-fd-card px-2 py-1 text-center text-xs font-medium ${
                  gaps.has(col) ? 'w-4 min-w-4' : 'min-w-24'
                }`}
              >
                {gaps.has(col) ? '' : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={row}>
              <th
                className={`sticky left-0 z-10 border border-fd-border bg-fd-card px-2 py-1 text-center text-xs font-medium ${
                  thickRows.includes(row) ? 'shadow-[inset_2px_0_0_0_var(--color-fd-border)]' : ''
                }`}
              >
                {row}
              </th>
              {columns.map((col) => {
                if (gaps.has(col)) {
                  return (
                    <td
                      key={col}
                      aria-hidden
                      className="w-4 min-w-4 border-y border-fd-border/40"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(135deg, var(--color-fd-border, rgba(128,128,128,.35)) 0 1px, transparent 1px 5px)',
                      }}
                    />
                  );
                }
                const slot = slotsByColumn[col][rowIdx];
                if (!slot || slot.kind === 'skip') return null;
                if (slot.kind === 'empty') {
                  return (
                    <td key={col} className="border border-fd-border/60 px-2 py-1.5 align-top">
                      <span className="text-xs text-fd-muted-foreground/50">—</span>
                    </td>
                  );
                }
                const { region } = slot;
                const key = cellKey(region.col, region.row);
                const hit = searching && matches(region.cell, query);
                return (
                  <td
                    key={col}
                    ref={(el) => registerCell(key, el)}
                    rowSpan={region.span}
                    className={`border border-fd-border px-2 py-1.5 align-top transition-opacity ${
                      thickRows.includes(region.row) ? 'border-t-2' : ''
                    } ${
                      hit
                        ? 'z-10 bg-amber-400/15 ring-2 ring-amber-500'
                        : searching
                          ? 'opacity-35'
                          : 'bg-fd-card'
                    }`}
                  >
                    <CellBody cell={region.cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-1 py-2 text-xs text-fd-muted-foreground">
        {cells === undefined ? null : null}
        Columns are letters, rows are numbers — <strong>B4</strong> means column B, drawer 4.
        Hatched narrow columns are aisles between bank sections; a drawer box swallows the empty
        slots beneath it, mirroring the physical bins. Heavy lines mark shelf boundaries.
      </p>
    </div>
  );
}

function RequestForm({ bank, onDone }: { bank: BankPage; onDone: () => void }) {
  const catalog = useMemo(() => bankCatalog(bank), [bank]);
  const OTHER = '__other__';
  const [form, setForm] = useState({ item: '', custom: '', quantity: '', name: '', reason: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const componentName = form.item === OTHER ? form.custom : form.item;
    if (!componentName.trim() || !form.name.trim()) return;
    setStatus('sending');
    const res = await mutateOps('/api/ops/requests', 'POST', {
      componentName: componentName.trim(),
      componentType: bank.title,
      quantity: form.quantity || '1',
      requesterName: form.name.trim(),
      reason: form.reason,
    });
    setStatus(res.ok ? 'sent' : 'error');
    if (res.ok) setTimeout(onDone, 1500);
  }

  const inputCls =
    'rounded-md border border-fd-border bg-fd-background px-2.5 py-1.5 text-sm outline-none focus:border-fd-primary';

  return (
    <form
      onSubmit={submit}
      className="not-prose mb-4 grid gap-3 rounded-lg border border-fd-border bg-fd-card p-4 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Part</span>
        <select
          value={form.item}
          onChange={(e) => set('item', e.target.value)}
          required
          className={inputCls}
        >
          <option value="" disabled>
            What do you need?
          </option>
          {catalog.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={OTHER}>Something else…</option>
        </select>
        {form.item === OTHER ? (
          <input
            value={form.custom}
            onChange={(e) => set('custom', e.target.value)}
            placeholder="Describe the part"
            required
            className={inputCls}
          />
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Quantity</span>
        <input
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          placeholder="e.g. 10, one roll, a handful"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Your name</span>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Why (optional)</span>
        <input
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          placeholder="Project, course, ran out mid-print…"
          className={inputCls}
        />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send request'}
        </button>
        {status === 'sent' ? (
          <span className="flex items-center gap-1 text-sm text-green-500">
            <Check className="size-4" /> Sent — exco will see it in the ops queue
          </span>
        ) : null}
        {status === 'error' ? (
          <span className="text-sm text-red-400">Failed — try again</span>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Interactive storage-bank grid. Members get a searchable, merged map of the
 * drawers plus a restock-request form; admin cell editing lives in the admin
 * panel (components/admin).
 */
export function ComponentBankWidget({ id }: { id: string }) {
  const { state } = useOpsState();
  const bank = state?.banks.find((b: BankPage) => b.id === id);
  const [query, setQuery] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());

  function jumpTo(key: string) {
    cellRefs.current.get(key)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  function registerCell(key: string, el: HTMLTableCellElement | null) {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }


  if (!bank) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        No component bank named “{id}”.
      </div>
    );
  }

  const results = query.trim()
    ? Object.entries(bank.grid.cells)
        .filter(([, cell]) => matches(cell, query))
        .map(([key]) => key)
    : [];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-fd-border p-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fd-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this bank — try “M3”, “wire”, “bearings”…"
          className="w-full rounded-md border border-fd-border bg-fd-background py-1.5 pl-8 pr-8 text-sm outline-none focus:border-fd-primary"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-fd-muted-foreground hover:text-fd-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {query.trim() ? (
        <span className="text-xs text-fd-muted-foreground">
          {results.length} drawer{results.length === 1 ? '' : 's'}:{' '}
          {results.slice(0, 8).map((key, i) => (
            <span key={key}>
              {i > 0 ? ', ' : ''}
              <button
                type="button"
                onClick={() => jumpTo(key)}
                className="rounded bg-amber-400/15 px-1 font-mono text-amber-600 ring-1 ring-amber-500/60 hover:bg-amber-400/30 dark:text-amber-400"
              >
                {key}
              </button>
            </span>
          ))}
          {results.length > 8 ? ` +${results.length - 8} more` : ''}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setRequesting((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-sm hover:bg-fd-accent"
      >
        <PackageOpen className="size-4" />
        {requesting ? 'Hide request form' : 'Request a restock'}
      </button>
      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-sm hover:bg-fd-accent"
      >
        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        {fullscreen ? 'Exit full screen' : 'Full screen'}
      </button>
    </div>
  );

  const body = (
    <div className="not-prose rounded-lg border border-fd-border bg-fd-background">
      {toolbar}
      {requesting ? <RequestForm bank={bank} onDone={() => setRequesting(false)} /> : null}
      <div className="max-h-[70vh]">
        <BankGrid bank={bank} query={query} registerCell={registerCell} />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-fd-background/98 p-3 backdrop-blur-sm sm:p-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-fd-border bg-fd-background">
          {toolbar}
          {requesting ? <RequestForm bank={bank} onDone={() => setRequesting(false)} /> : null}
          <div className="min-h-0 flex-1 overflow-auto">
            <BankGrid bank={bank} query={query} registerCell={registerCell} />
          </div>
        </div>
      </div>
    );
  }

  return body;
}
