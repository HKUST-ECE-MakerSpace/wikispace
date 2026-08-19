import { getSettings } from './store';

/**
 * Send a WhatsApp message to the configured group via Green-API. Never
 * throws: unconfigured WhatsApp logs a warning, transport/API failures are
 * logged via console.error only.
 */
export async function notifyWhatsApp(message: string): Promise<void> {
  const { whatsapp } = getSettings();
  if (!whatsapp) {
    console.warn(`[notify] WhatsApp not configured, skipping: ${message}`);
    return;
  }
  try {
    const url = `https://api.green-api.com/waInstance${whatsapp.instanceId}/sendMessage/${whatsapp.token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: whatsapp.groupId, message }),
    });
    if (!res.ok) {
      console.error(`[notify] Green-API responded ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('[notify] WhatsApp send failed:', err);
  }
}
