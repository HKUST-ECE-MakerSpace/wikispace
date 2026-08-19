'use client';

import { useEffect, useState } from 'react';
import type { Settings, WhatsAppConfig } from '@/lib/types';
import { useOpsState } from '@/components/ops/use-ops-state';
import { saveLabel, useAdminMutation } from './use-admin-mutation';

const EMPTY_WHATSAPP: WhatsAppConfig = { instanceId: '', token: '', groupId: '' };

/** Settings tab: WhatsApp alerts, public welcome text, password change. */
export function SettingsTab({ onAuthLost }: { onAuthLost: () => void }) {
  const { refresh } = useOpsState();
  const whatsAppSave = useAdminMutation(onAuthLost, refresh);
  const welcomeSave = useAdminMutation(onAuthLost, refresh);
  const passwordSave = useAdminMutation(onAuthLost, refresh);
  const [loaded, setLoaded] = useState(false);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>(EMPTY_WHATSAPP);
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ops/settings', { cache: 'no-store' });
        if (res.status === 401) {
          onAuthLost();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const settings = (await res.json()) as Settings;
        if (cancelled) return;
        setWhatsapp(settings.whatsapp ?? EMPTY_WHATSAPP);
        setWelcomeTitle(settings.welcomeTitle ?? '');
        setWelcomeMessage(settings.welcomeMessage ?? '');
      } catch {
        // form stays empty; saves still work
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onAuthLost]);

  async function saveWhatsapp() {
    const empty = !whatsapp.instanceId && !whatsapp.token && !whatsapp.groupId;
    await whatsAppSave.run('/api/ops/settings', 'PUT', { whatsapp: empty ? null : whatsapp });
  }

  async function saveWelcome() {
    await welcomeSave.run('/api/ops/settings', 'PUT', { welcomeTitle, welcomeMessage });
  }

  async function changePassword() {
    const ok = await passwordSave.run('/api/ops/settings', 'PUT', {
      currentPassword,
      newPassword,
    });
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      <section className="rounded-lg border border-fd-border bg-fd-card p-4">
        <h2 className="font-semibold">WhatsApp alerts</h2>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          Reports are mirrored to the exco group chat. Leave all fields empty and save to disable.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Instance ID
            <input
              value={whatsapp.instanceId}
              onChange={(e) => setWhatsapp({ ...whatsapp, instanceId: e.target.value })}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Token
            <input
              value={whatsapp.token}
              onChange={(e) => setWhatsapp({ ...whatsapp, token: e.target.value })}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Group ID
            <input
              value={whatsapp.groupId}
              onChange={(e) => setWhatsapp({ ...whatsapp, groupId: e.target.value })}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={whatsAppSave.state === 'saving'}
            onClick={() => void saveWhatsapp()}
            className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            {saveLabel(whatsAppSave.state, 'Save WhatsApp config')}
          </button>
          {whatsAppSave.error ? (
            <span className="text-sm text-red-400">{whatsAppSave.error}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-fd-border bg-fd-card p-4">
        <h2 className="font-semibold">Welcome message</h2>
        <p className="mt-1 text-sm text-fd-muted-foreground">Shown at the top of the home page.</p>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Message
            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={welcomeSave.state === 'saving'}
            onClick={() => void saveWelcome()}
            className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            {saveLabel(welcomeSave.state, 'Save welcome message')}
          </button>
          {welcomeSave.error ? (
            <span className="text-sm text-red-400">{welcomeSave.error}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-fd-border bg-fd-card p-4">
        <h2 className="font-semibold">Change password</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5"
            />
          </label>
          <button
            type="button"
            disabled={!currentPassword || !newPassword || passwordSave.state === 'saving'}
            onClick={() => void changePassword()}
            className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            {saveLabel(passwordSave.state, 'Change password')}
          </button>
        </div>
        {passwordSave.error ? (
          <p className="mt-2 text-sm text-red-400">{passwordSave.error}</p>
        ) : null}
      </section>
    </div>
  );
}
