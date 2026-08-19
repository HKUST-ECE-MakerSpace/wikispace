'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import type { BoxItem, Grid, GridCell } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

function cellKey(col: string, row: number): string {
  return `${col}${row}`;
}

function cloneCell(cell: GridCell | undefined): GridCell {
  return {
    label: cell?.label ?? '',
    description: cell?.description ?? '',
    items: cell?.items?.map((item) => ({ ...item })) ?? [],
  };
}

/* ---------------------------------------------------------------------------
 * Stock badges.
 *
 * GridCell has no first-class quantity field — counts only surface as
 * unit-anchored text like "50 pcs" inside descriptions and box contents.
 * The pattern deliberately ignores bare numbers so part values ("M3x8",
 * "10k Ohm") never parse as stock levels.
 * ------------------------------------------------------------------------- */

/** Explicit counts must carry a unit ("12 pcs", "3 pieces"). */
const QTY_PATTERN = /(-?\d+)\s*(?:pcs?\.?|pieces)\b/i;
/** Parsed counts at or below this line are flagged as running low. */
const LOW_STOCK_THRESHOLD = 5;

type StockLevel = 'stocked' | 'low' | 'empty' | 'negative';

interface CellStock {
  level: StockLevel;
  /** Parsed count; null when the cell carries no explicit "N pcs" text. */
  qty: number | null;
}

const STOCK_BADGE_STYLES: Record<StockLevel, string> = {
  stocked: 'bg-green-500/15 text-green-700 [.dark_&]:text-green-400',
  low: 'bg-amber-500/15 text-amber-700 [.dark_&]:text-amber-400',
  empty: 'bg-fd-muted-foreground/10 text-fd-muted-foreground',
  negative: 'bg-red-500/15 text-red-600 [.dark_&]:text-red-400',
};

const STOCK_LABELS: Record<StockLevel, string> = {
  stocked: 'Stocked',
  low: 'Low stock',
  empty: 'Empty',
  negative: 'Negative count',
};

function cellStock(cell: GridCell | undefined): CellStock | null {
  if (!cell) return null;
  const text = [
    cell.description,
    ...(cell.items ?? []).map((item) => `${item.name} ${item.contents}`),
  ]
    .filter(Boolean)
    .join(' ');
  const match = QTY_PATTERN.exec(text);
  const qty = match ? Number.parseInt(match[1], 10) : null;
  if (qty !== null && qty < 0) return { level: 'negative', qty };
  if (qty === 0) return { level: 'empty', qty };
  if (qty !== null) return { level: qty <= LOW_STOCK_THRESHOLD ? 'low' : 'stocked', qty };
  const hasDetail = Boolean(cell.description) || (cell.items?.length ?? 0) > 0;
  return { level: hasDetail ? 'stocked' : 'empty', qty: null };
}

function StockBadge({ stock }: { stock: CellStock }) {
  return (
    <span
      title={STOCK_LABELS[stock.level]}
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-4 ${STOCK_BADGE_STYLES[stock.level]}`}
    >
      {stock.qty ?? '•'}
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * Search: cells match on key, label, description and box contents.
 * ------------------------------------------------------------------------- */

function cellText(key: string, cell: GridCell): string {
  return [
    key,
    cell.label,
    cell.description,
    ...(cell.items ?? []).flatMap((item) => [item.name, item.contents]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const inputClass =
  'w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm outline-none transition-colors focus:border-fd-primary/50 focus:ring-2 focus:ring-fd-primary/20';

/* ---------------------------------------------------------------------------
 * Cell editor: bottom sheet on phones (drag-handle look, safe-area padding,
 * slide-up), centered dialog on sm+.
 * ------------------------------------------------------------------------- */

function CellEditor({
  bankId,
  cellKey: key,
  cell,
  grid,
  onAuthLost,
  refresh,
  onClose,
}: {
  bankId: string;
  cellKey: string;
  cell: GridCell;
  grid: Grid;
  onAuthLost: () => void;
  refresh: () => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GridCell>(cell);
  const { run, state, error } = useAdminMutation(onAuthLost, refresh);

  /** Escape closes; background scroll locks while the sheet is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function updateItem(index: number, patch: Partial<BoxItem>) {
    setDraft((d) => ({
      ...d,
      items: d.items?.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  async function saveCell() {
    const next: Grid = { ...grid, cells: { ...grid.cells, [key]: draft } };
    if (await run('/api/ops/banks', 'PUT', { id: bankId, grid: next })) onClose();
  }

  async function deleteCell() {
    if (!window.confirm(`Delete cell ${key}?`)) return;
    const cells = { ...grid.cells };
    delete cells[key];
    const next: Grid = { ...grid, cells };
    if (await run('/api/ops/banks', 'PUT', { id: bankId, grid: next })) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit cell ${key}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes banks-sheet-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-fd-border bg-fd-card shadow-xl [animation:banks-sheet-in_.25s_cubic-bezier(.16,1,.3,1)] sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-handle affordance (sheet on phones) */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-fd-border sm:hidden"
        />

        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3 sm:pt-4">
          <h3 className="text-base font-semibold">Cell {key}</h3>
          <button
            type="button"
            aria-label="Close editor"
            onClick={onClose}
            className="-mr-1 flex size-10 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-background hover:text-fd-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <label className="flex flex-col gap-1 text-sm">
            Label
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            Description
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className={`${inputClass} resize-y`}
            />
          </label>

          <div className="mt-4 text-sm">
            <div className="font-medium">Boxed items</div>
            <div className="mt-2 flex flex-col gap-2">
              {(draft.items ?? []).map((item, index) => (
                <div key={index} className="rounded-lg border border-fd-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-fd-muted-foreground">
                      Box {index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove box ${item.name || index + 1}`}
                      onClick={() =>
                        setDraft({ ...draft, items: draft.items?.filter((_, i) => i !== index) })
                      }
                      className="-m-1 flex size-10 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-red-400/10 hover:text-red-400"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <label className="mt-1 flex flex-col gap-1 text-xs text-fd-muted-foreground">
                    Name
                    <input
                      placeholder="R1"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="mt-2 flex flex-col gap-1 text-xs text-fd-muted-foreground">
                    Contents
                    <input
                      placeholder="What is inside"
                      value={item.contents}
                      onChange={(e) => updateItem(index, { contents: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, items: [...(draft.items ?? []), { name: '', contents: '' }] })
              }
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-fd-border py-2.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:text-fd-primary"
            >
              <Plus className="size-4" /> Add box
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={() => void deleteCell()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-red-400/40 px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            <Trash2 className="size-4" /> Delete cell
          </button>
        </div>

        <div className="border-t border-fd-border px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-fd-border px-3 py-2.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={state === 'saving'}
              onClick={() => void saveCell()}
              className="w-full rounded-md bg-fd-primary px-3 py-2.5 text-sm font-medium text-fd-primary-foreground transition-colors disabled:opacity-50 sm:w-auto"
            >
              {saveLabel(state)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Banks tab: pick a bank, scan the grid, tap any cell to edit it.
 * ------------------------------------------------------------------------- */

/** Fixed layout keeps columns uniform (spreadsheet feel); min-width forces
 *  horizontal scrolling instead of squashing cells on narrow screens. */
const COLUMN_WIDTH_PX = 112;
const LABEL_COLUMN_WIDTH_PX = 44;

export function BanksTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, error, refresh } = useOpsState();
  const banks = state?.banks ?? [];
  const [selectedId, setSelectedId] = useState<string>();
  const [editingKey, setEditingKey] = useState<string>();
  const [query, setQuery] = useState('');

  const activeId =
    selectedId && banks.some((b) => b.id === selectedId) ? selectedId : banks[0]?.id;
  const bank = banks.find((b) => b.id === activeId);

  const needle = query.trim().toLowerCase();
  /** Keys of cells matching the query; null while the box is empty. */
  const matchingKeys = useMemo(() => {
    if (!bank || !needle) return null;
    const keys = new Set<string>();
    for (const [key, cell] of Object.entries(bank.grid.cells)) {
      if (cellText(key, cell).includes(needle)) keys.add(key);
    }
    return keys;
  }, [bank, needle]);

  if (banks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        {error ? 'Live state unavailable — is the API running?' : 'No component banks yet.'}
      </div>
    );
  }

  const rows = bank
    ? Array.from(
        { length: bank.grid.rowRange[1] - bank.grid.rowRange[0] + 1 },
        (_, i) => bank.grid.rowRange[0] + i,
      )
    : [];
  const editing =
    bank && editingKey ? { key: editingKey, cell: cloneCell(bank.grid.cells[editingKey]) } : undefined;
  const totalCells = bank ? Object.keys(bank.grid.cells).length : 0;
  const filtering = matchingKeys !== null;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Component banks">
          {banks.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={b.id === activeId}
              onClick={() => {
                setSelectedId(b.id);
                setEditingKey(undefined);
                setQuery('');
              }}
              className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                b.id === activeId
                  ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                  : 'border-fd-border text-fd-muted-foreground hover:border-fd-primary/30 hover:text-fd-primary'
              }`}
            >
              {b.icon} {b.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fd-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${bank?.title ?? 'cells'}…`}
              aria-label="Search cells in this bank"
              className={`${inputClass} pl-9`}
            />
          </div>
          {filtering ? (
            <span className="shrink-0 text-xs tabular-nums text-fd-muted-foreground">
              {matchingKeys.size} of {totalCells}
            </span>
          ) : null}
        </div>
      </div>

      {bank && filtering && matchingKeys.size === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
          No cells in {bank.title} match “{query.trim()}”.
        </p>
      ) : null}

      {bank && !(filtering && matchingKeys.size === 0) ? (
        <div className="mt-4 max-h-[70vh] overscroll-contain overflow-auto rounded-lg border border-fd-border bg-fd-card">
          <table
            className="w-full table-fixed border-separate border-spacing-0 text-sm"
            style={{ minWidth: LABEL_COLUMN_WIDTH_PX + bank.grid.columns.length * COLUMN_WIDTH_PX }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-label="Row"
                  className="sticky left-0 top-0 z-30 w-11 border-b border-r border-fd-border bg-fd-card"
                />
                {bank.grid.columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    style={{ width: COLUMN_WIDTH_PX }}
                    className="sticky top-0 z-20 border-b border-fd-border bg-fd-card px-2 py-2 text-center font-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const thick = bank.grid.thickRows.includes(row);
                return (
                  <tr key={row}>
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 border-b border-r border-fd-border bg-fd-card text-center text-xs font-medium tabular-nums text-fd-muted-foreground ${
                        thick ? 'border-t-2 border-t-fd-border' : ''
                      }`}
                    >
                      {row}
                    </th>
                    {bank.grid.columns.map((col) => {
                      const key = cellKey(col, row);
                      const cell = bank.grid.cells[key];
                      const stock = cellStock(cell);
                      const dimmed = matchingKeys !== null && !matchingKeys.has(key);
                      const hasContent = Boolean(
                        cell?.label || cell?.description || (cell?.items?.length ?? 0) > 0,
                      );
                      return (
                        <td
                          key={col}
                          className={`border-b border-fd-border/60 ${thick ? 'border-t-2 border-t-fd-border' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingKey(key)}
                            title={`Edit cell ${key}`}
                            className={`w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fd-primary/10 focus-visible:outline-2 focus-visible:outline-fd-primary ${
                              dimmed ? 'pointer-events-none opacity-20' : ''
                            }`}
                          >
                            {cell && stock && hasContent ? (
                              <span className="flex min-h-[44px] flex-col gap-0.5">
                                <span className="flex items-center justify-between gap-1">
                                  <span className="truncate text-[13px] font-medium">
                                    {cell.label}
                                  </span>
                                  <StockBadge stock={stock} />
                                </span>
                                {cell.description ? (
                                  <span className="line-clamp-2 text-xs leading-snug text-fd-muted-foreground">
                                    {cell.description}
                                  </span>
                                ) : (cell.items?.length ?? 0) > 0 ? (
                                  <span className="truncate text-xs text-fd-muted-foreground">
                                    {cell.items.map((item) => item.name).join(', ')}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="flex min-h-[44px] items-center justify-center text-xs text-fd-muted-foreground/50">
                                + {key}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing && bank ? (
        <CellEditor
          bankId={bank.id}
          cellKey={editing.key}
          cell={editing.cell}
          grid={bank.grid}
          onAuthLost={onAuthLost}
          refresh={refresh}
          onClose={() => setEditingKey(undefined)}
        />
      ) : null}
    </div>
  );
}
