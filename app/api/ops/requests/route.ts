import { randomBytes } from 'node:crypto';
import { badRequest } from '@/lib/auth';
import { notifyWhatsApp } from '@/lib/notify';
import { getRequests, saveRequests } from '@/lib/store';
import type { ComponentRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Public: members request component restocks. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { componentName, componentType, quantity, requesterName, reason } = body;
  if (typeof componentName !== 'string' || componentName.length === 0) return badRequest('componentName must be a non-empty string');
  if (typeof componentType !== 'string' || componentType.length === 0) return badRequest('componentType must be a non-empty string');
  if (typeof quantity !== 'string') return badRequest('quantity must be a string');
  if (typeof requesterName !== 'string' || requesterName.length === 0) return badRequest('requesterName must be a non-empty string');
  if (typeof reason !== 'string') return badRequest('reason must be a string');

  const item: ComponentRequest = {
    id: `req_${Date.now()}_${randomBytes(2).toString('hex')}`,
    componentName,
    componentType,
    quantity,
    requesterName,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  saveRequests([...getRequests(), item]);

  await notifyWhatsApp(`Component request: ${componentName} (${quantity}) by ${requesterName} — ${reason}`);
  return Response.json(item, { status: 201 });
}
