import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import { getBanks, saveBanks } from '@/lib/store';
import type { Grid } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isValidGrid(value: unknown): value is Grid {
  if (typeof value !== 'object' || value === null) return false;
  const grid = value as Record<string, unknown>;
  if (!Array.isArray(grid.columns) || !grid.columns.every((c) => typeof c === 'string')) return false;
  if (
    !Array.isArray(grid.rowRange) ||
    grid.rowRange.length !== 2 ||
    !grid.rowRange.every((n) => typeof n === 'number')
  ) {
    return false;
  }
  if (!Array.isArray(grid.thickRows) || !grid.thickRows.every((n) => typeof n === 'number')) return false;
  if (typeof grid.cells !== 'object' || grid.cells === null || Array.isArray(grid.cells)) return false;
  return Object.values(grid.cells as Record<string, unknown>).every((cell) => {
    if (typeof cell !== 'object' || cell === null) return false;
    const { label, description, items } = cell as Record<string, unknown>;
    if (typeof label !== 'string' || typeof description !== 'string') return false;
    if (items === undefined) return true;
    if (!Array.isArray(items)) return false;
    return items.every(
      (box) =>
        typeof box === 'object' &&
        box !== null &&
        typeof (box as Record<string, unknown>).name === 'string' &&
        typeof (box as Record<string, unknown>).contents === 'string',
    );
  });
}

/** Replace one bank's grid, addressed by bank id. */
export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== 'string' || body.id.length === 0) {
    return badRequest('id must be a non-empty string');
  }
  if (!isValidGrid(body.grid)) {
    return badRequest('grid must be {columns: string[], rowRange: [number, number], thickRows: number[], cells: Record<string, GridCell>}');
  }

  const banks = getBanks();
  const bank = banks.find((b) => b.id === body.id);
  if (!bank) return Response.json({ error: 'bank not found' }, { status: 404 });
  bank.grid = body.grid;
  saveBanks(banks);
  return Response.json(bank);
}
