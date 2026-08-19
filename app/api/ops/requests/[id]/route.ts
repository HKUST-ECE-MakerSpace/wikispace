import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import { getRequests, saveRequests } from '@/lib/store';
import type { RequestStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const REQUEST_STATUSES = ['pending', 'ordered', 'fulfilled', 'denied'] as const;

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { status } = body;
  if (!isRequestStatus(status)) {
    return badRequest(`status must be one of: ${REQUEST_STATUSES.join(', ')}`);
  }

  const requests = getRequests();
  const item = requests.find((r) => r.id === id);
  if (!item) return Response.json({ error: 'request not found' }, { status: 404 });
  item.status = status;
  saveRequests(requests);
  return Response.json(item);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;
  const requests = getRequests();
  if (!requests.some((r) => r.id === id)) return Response.json({ error: 'request not found' }, { status: 404 });
  saveRequests(requests.filter((r) => r.id !== id));
  return Response.json({ ok: true });
}
