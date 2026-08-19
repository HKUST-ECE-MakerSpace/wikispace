import { randomBytes } from 'node:crypto';
import { badRequest } from '@/lib/auth';
import { notifyWhatsApp } from '@/lib/notify';
import { getMachines, getReports, saveMachines, saveReports } from '@/lib/store';
import type { Report } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Public: members submit issue reports. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { machineId, issueType, reportedBy, description } = body;
  if (typeof machineId !== 'string' || machineId.length === 0) return badRequest('machineId must be a non-empty string');
  if (typeof issueType !== 'string' || issueType.length === 0) return badRequest('issueType must be a non-empty string');
  if (typeof reportedBy !== 'string' || reportedBy.length === 0) return badRequest('reportedBy must be a non-empty string');
  if (typeof description !== 'string') return badRequest('description must be a string');

  const machines = getMachines();
  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return Response.json({ error: 'machine not found' }, { status: 404 });

  const report: Report = {
    id: `report_${Date.now()}_${randomBytes(2).toString('hex')}`,
    machineId,
    machineName: machine.name,
    issueType,
    reportedBy,
    description,
    status: 'open',
    adminNotes: '',
    createdAt: new Date().toISOString(),
  };
  saveReports([...getReports(), report]);

  // Legacy behaviour: a new report demotes the machine to needs-attention.
  machine.status = 'needs-attention';
  saveMachines(machines);

  await notifyWhatsApp(`New report: ${machine.name} — ${issueType} by ${reportedBy}`);
  return Response.json(report, { status: 201 });
}
