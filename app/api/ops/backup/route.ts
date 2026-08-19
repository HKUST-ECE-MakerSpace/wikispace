import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import {
  getBanks,
  getFilament,
  getMachines,
  getReports,
  getRequests,
  getSettings,
  saveBanks,
  saveFilament,
  saveMachines,
  saveReports,
  saveRequests,
  saveSettings,
} from '@/lib/store';
import type { BankPage, ComponentRequest, FilamentItem, MachineState, Report, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Download every collection as one JSON file. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const backup = {
    machines: getMachines(),
    reports: getReports(),
    requests: getRequests(),
    filament: getFilament(),
    banks: getBanks(),
    settings: getSettings(),
  };
  const date = new Date().toISOString().slice(0, 10);
  const res = Response.json(backup);
  res.headers.append('Content-Disposition', `attachment; filename="wiki-backup-${date}.json"`);
  return res;
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

/** Restore collections from a backup JSON produced by GET. */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const backup = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!backup) return badRequest('invalid JSON body');
  const { machines, reports, requests, filament, banks, settings } = backup;
  if (machines !== undefined && !isArray(machines)) return badRequest('machines must be an array');
  if (reports !== undefined && !isArray(reports)) return badRequest('reports must be an array');
  if (requests !== undefined && !isArray(requests)) return badRequest('requests must be an array');
  if (filament !== undefined && !isArray(filament)) return badRequest('filament must be an array');
  if (banks !== undefined && !isArray(banks)) return badRequest('banks must be an array');
  if (
    settings !== undefined &&
    (typeof settings !== 'object' ||
      settings === null ||
      typeof (settings as Record<string, unknown>).adminPasswordHash !== 'string' ||
      typeof (settings as Record<string, unknown>).sessionSecret !== 'string')
  ) {
    return badRequest('settings must include adminPasswordHash and sessionSecret strings');
  }

  const restored: string[] = [];
  if (machines !== undefined) {
    saveMachines(machines as MachineState[]);
    restored.push('machines');
  }
  if (reports !== undefined) {
    saveReports(reports as Report[]);
    restored.push('reports');
  }
  if (requests !== undefined) {
    saveRequests(requests as ComponentRequest[]);
    restored.push('requests');
  }
  if (filament !== undefined) {
    saveFilament(filament as FilamentItem[]);
    restored.push('filament');
  }
  if (banks !== undefined) {
    saveBanks(banks as BankPage[]);
    restored.push('banks');
  }
  if (settings !== undefined) {
    saveSettings(settings as Settings);
    restored.push('settings');
  }
  if (restored.length === 0) return badRequest('backup contains no collections to restore');
  return Response.json({ ok: true, restored });
}
