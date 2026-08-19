import { getBanks, getFilament, getMachines, getReports, getRequests, getSettings } from '@/lib/store';
import type { OpsState } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Public live state, polled by the ops UI. Settings secrets (password hash,
 * session secret, WhatsApp token) are never included — only the welcome copy.
 */
export async function GET() {
  const settings = getSettings();
  const state: OpsState & { welcomeTitle: string; welcomeMessage: string } = {
    machines: getMachines(),
    reports: getReports(),
    requests: getRequests(),
    filament: getFilament(),
    banks: getBanks(),
    welcomeTitle: settings.welcomeTitle,
    welcomeMessage: settings.welcomeMessage,
    generatedAt: new Date().toISOString(),
  };
  return Response.json(state);
}
