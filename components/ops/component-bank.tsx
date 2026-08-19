'use client';

import type { BankPage, GridCell } from '@/lib/types';
import { useOpsState } from './use-ops-state';

function cellKey(col: string, row: number): string {
  return `${col}${row}`;
}

function renderCell(cell: GridCell | undefined) {
  if (!cell) return null;
  const hasDetail = Boolean(cell.description) || (cell.items?.length ?? 0) > 0;
  if (!hasDetail) {
    return <span className="text-fd-muted-foreground">{cell.label}</span>;
  }
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

/**
 * Interactive storage-bank grid. Members get a read-only map; admin cell
 * editing lives in the admin panel (components/admin).
 */
export function ComponentBankWidget({ id }: { id: string }) {
  const { state } = useOpsState();
  const bank = state?.banks.find((b: BankPage) => b.id === id);

  if (!bank) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        No component bank named “{id}”.
      </div>
    );
  }

  const [startRow, endRow] = bank.grid.rowRange;
  const rows = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i);

  return (
    <div className="not-prose overflow-x-auto rounded-lg border border-fd-border">
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
                const cell = bank.grid.cells[cellKey(col, row)];
                return (
                  <td
                    key={col}
                    className="border-b border-fd-border/60 px-2 py-1.5 align-top"
                  >
                    {renderCell(cell)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
