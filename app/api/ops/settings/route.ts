import { badRequest, isAdminRequest, unauthorized, verifyPassword, hashPassword } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/store';
import type { WhatsAppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Full settings (including secrets) for the admin panel form. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  return Response.json(getSettings());
}

function isValidWhatsApp(value: unknown): value is WhatsAppConfig {
  if (typeof value !== 'object' || value === null) return false;
  const { instanceId, token, groupId } = value as Record<string, unknown>;
  return (
    typeof instanceId === 'string' &&
    instanceId.length > 0 &&
    typeof token === 'string' &&
    token.length > 0 &&
    typeof groupId === 'string' &&
    groupId.length > 0
  );
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { whatsapp, welcomeTitle, welcomeMessage, currentPassword, newPassword } = body;
  if (whatsapp !== undefined && whatsapp !== null && !isValidWhatsApp(whatsapp)) {
    return badRequest('whatsapp must be null or {instanceId, token, groupId} as non-empty strings');
  }
  if (welcomeTitle !== undefined && typeof welcomeTitle !== 'string') return badRequest('welcomeTitle must be a string');
  if (welcomeMessage !== undefined && typeof welcomeMessage !== 'string') return badRequest('welcomeMessage must be a string');
  if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length === 0)) {
    return badRequest('newPassword must be a non-empty string');
  }

  const settings = getSettings();
  if (whatsapp !== undefined) settings.whatsapp = whatsapp;
  if (welcomeTitle !== undefined) settings.welcomeTitle = welcomeTitle;
  if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage;
  if (newPassword !== undefined) {
    if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, settings.adminPasswordHash)) {
      return badRequest('currentPassword is required and must be correct to change the password');
    }
    settings.adminPasswordHash = hashPassword(newPassword);
  }
  saveSettings(settings);
  return Response.json(settings);
}
