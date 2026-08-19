import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import { notifyWhatsApp } from '@/lib/notify';
import { getFilament, saveFilament } from '@/lib/store';
import type { FilamentItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isValidFilamentItem(value: unknown): value is FilamentItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.material === 'string' &&
    typeof item.brand === 'string' &&
    typeof item.size === 'string' &&
    Array.isArray(item.colors) &&
    item.colors.every((c) => typeof c === 'string') &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity)
  );
}

/** Replace the whole inventory; alert when an item drops to ≤2 from >2. */
export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !Array.isArray(body.items) || !body.items.every(isValidFilamentItem)) {
    return badRequest('items must be an array of filament items {id, material, brand, size, colors: string[], quantity: number}');
  }
  const items = body.items as FilamentItem[];

  const before = new Map(getFilament().map((item) => [item.id, item.quantity]));
  saveFilament(items);
  for (const item of items) {
    const oldQuantity = before.get(item.id);
    if (oldQuantity !== undefined && oldQuantity > 2 && item.quantity <= 2) {
      await notifyWhatsApp(`Filament low: ${item.material} ${item.brand} (${item.size}) — quantity ${item.quantity}`);
    }
  }
  return Response.json(items);
}
