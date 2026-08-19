import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import { getMachines, saveMachines } from '@/lib/store';
import { MACHINE_STATUSES, type MachineState } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { status, statusNote, quantity } = body;
  if (status !== undefined && (typeof status !== 'string' || !MACHINE_STATUSES.includes(status as never))) {
    return badRequest(`status must be one of: ${MACHINE_STATUSES.join(', ')}`);
  }
  if (statusNote !== undefined && typeof statusNote !== 'string') return badRequest('statusNote must be a string');
  if (quantity !== undefined && typeof quantity !== 'string') return badRequest('quantity must be a string');

  const machines = getMachines();
  const machine = machines.find((m) => m.id === id);
  if (!machine) return Response.json({ error: 'machine not found' }, { status: 404 });
  if (status !== undefined) machine.status = status as MachineState['status'];
  if (statusNote !== undefined) machine.statusNote = statusNote;
  if (quantity !== undefined) machine.quantity = quantity;
  saveMachines(machines);
  return Response.json(machine);
}
