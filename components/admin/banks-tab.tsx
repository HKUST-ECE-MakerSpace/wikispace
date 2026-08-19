'use client';

import { useState } from 'react';
import type { BankPage, GridCell, Grid, OpsState } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

/**
 * OpsState.banks is missing from lib/types.ts mid-migration (the shared
 * contract includes it); extend locally until the lead restores the field.
 */
type OpsStateWithBanks = OpsState & { banks?: BankPage[] };

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

function CellModal({
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-fd-border bg-fd-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Cell {key}</h3>

        <label className="mt-3 flex flex-col gap-1 text-sm">
          Label
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          />
        </label>
        <label className="mt-2 flex flex-col gap-1 text-sm">
          Description
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
          />
        </label>

        <div className="mt-3 text-sm">
          <div className="font-medium">Boxed items</div>
          <div className="mt-1 flex flex-col gap-2">
            {(draft.items ?? []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      items: draft.items?.map((it, i) =>
                        i === index ? { ...it, name: e.target.value } : it,
                      ),
                    })
                  }
                  className="w-28 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                />
                <input
                  placeholder="Contents"
                  value={item.contents}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      items: draft.items?.map((it, i) =>
                        i === index ? { ...it, contents: e.target.value } : it,
                      ),
                    })
                  }
                  className="flex-1 rounded-md border border-fd-border bg-fd-background px-2 py-1"
                />
                <button
                  type="button"
                  aria-label={`Remove item ${item.name || index + 1}`}
                  onClick={() =>
                    setDraft({ ...draft, items: draft.items?.filter((_, i) => i !== index) })
                  }
                  className="rounded-md border border-red-400/40 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-400/10"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft({ ...draft, items: [...(draft.items ?? []), { name: '', contents: '' }] })
            }
            className="mt-2 rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground hover:text-fd-primary"
          >
            + Add item
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void deleteCell()}
            className="rounded-md border border-red-400/40 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-400/10"
          >
            Delete cell
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={state === 'saving'}
              onClick={() => void saveCell()}
              className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
            >
              {saveLabel(state)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Banks tab: pick a bank, then click any cell to edit it in a modal. */
export function BanksTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { state, error, refresh } = useOpsState();
  const banks: BankPage[] = (state as OpsStateWithBanks | undefined)?.banks ?? [];
  const [selectedId, setSelectedId] = useState<string>();
  const activeId =
    selectedId && banks.some((b) => b.id === selectedId) ? selectedId : banks[0]?.id;
  const bank = banks.find((b) => b.id === activeId);
  const [editingKey, setEditingKey] = useState<string>();

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

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {banks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setSelectedId(b.id);
              setEditingKey(undefined);
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

      {bank ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-fd-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-fd-border bg-fd-card px-2 py-1.5" />
                {bank.grid.columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-fd-border bg-fd-card px-2 py-1.5 text-center font-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row}
                  className={bank.grid.thickRows.includes(row) ? 'border-t-2' : undefined}
                >
                  <th className="sticky left-0 z-10 border-b border-fd-border bg-fd-card px-2 py-1.5 text-center font-medium">
                    {row}
                  </th>
                  {bank.grid.columns.map((col) => {
                    const key = cellKey(col, row);
                    const cell = bank.grid.cells[key];
                    return (
                      <td
                        key={col}
                        className="border-b border-fd-border/60 px-2 py-1.5 align-top"
                      >
                        <button
                          type="button"
                          onClick={() => setEditingKey(key)}
                          title={`Edit cell ${key}`}
                          className="w-full rounded-md px-1 py-0.5 text-left hover:bg-fd-primary/10"
                        >
                          {cell?.label ? (
                            <div className="leading-tight">
                              <div>{cell.label}</div>
                              {cell.description ? (
                                <div className="text-xs text-fd-muted-foreground">
                                  {cell.description}
                                </div>
                              ) : null}
                              {cell.items?.map((item) => (
                                <div key={item.name} className="text-xs text-fd-muted-foreground">
                                  {item.name}: {item.contents}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-fd-muted-foreground/60">+ {key}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing && bank ? (
        <CellModal
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
