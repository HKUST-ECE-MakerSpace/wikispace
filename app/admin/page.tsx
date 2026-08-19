'use client';

import { useCallback, useEffect, useState } from 'react';
import { BackupTab } from '@/components/admin/backup-tab';
import { BanksTab } from '@/components/admin/banks-tab';
import { FilamentTab } from '@/components/admin/filament-tab';
import { LoginForm } from '@/components/admin/login-form';
import { MachinesTab } from '@/components/admin/machines-tab';
import { ReportsTab } from '@/components/admin/reports-tab';
import { RequestsTab } from '@/components/admin/requests-tab';
import { SettingsTab } from '@/components/admin/settings-tab';

type TabId = 'machines' | 'reports' | 'requests' | 'filament' | 'banks' | 'settings' | 'backup';

const TABS: { id: TabId; label: string }[] = [
  { id: 'machines', label: 'Machines' },
  { id: 'reports', label: 'Reports' },
  { id: 'requests', label: 'Requests' },
  { id: 'filament', label: 'Filament' },
  { id: 'banks', label: 'Banks' },
  { id: 'settings', label: 'Settings' },
  { id: 'backup', label: 'Backup' },
];

/** Same key the legacy app used, so exco keep their tab across the switch. */
const TAB_STORAGE_KEY = 'adminTab';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [tab, setTab] = useState<TabId>('machines');

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = (await res.json()) as { authenticated?: boolean };
      setAuthenticated(Boolean(data.authenticated));
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && TABS.some((t) => t.id === saved)) setTab(saved as TabId);
  }, []);

  /**
   * Persist only on explicit clicks — a mount-time write would clobber the
   * stored tab before the restore effect's setTab has landed.
   */
  function selectTab(id: TabId) {
    setTab(id);
    localStorage.setItem(TAB_STORAGE_KEY, id);
  }

  /** Any tab mutation hitting 401 lands back at the login gate. */
  const onAuthLost = useCallback(() => {
    setAuthenticated(false);
    setLoggedOut(true);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setLoggedOut(false);
  }

  // The login gate renders on first paint (SSR included); the session check
  // on mount swaps straight to the panel if a valid cookie exists.
  if (!authenticated) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <LoginForm
          notice={loggedOut ? 'Logged out — your session expired. Log in again.' : undefined}
          onSuccess={() => {
            setLoggedOut(false);
            void checkSession();
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-fd-border px-3 py-1.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
        >
          Log out
        </button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                : 'border-fd-border text-fd-muted-foreground hover:border-fd-primary/30 hover:text-fd-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'machines' && <MachinesTab onAuthLost={onAuthLost} />}
        {tab === 'reports' && <ReportsTab onAuthLost={onAuthLost} />}
        {tab === 'requests' && <RequestsTab onAuthLost={onAuthLost} />}
        {tab === 'filament' && <FilamentTab onAuthLost={onAuthLost} />}
        {tab === 'banks' && <BanksTab onAuthLost={onAuthLost} />}
        {tab === 'settings' && <SettingsTab onAuthLost={onAuthLost} />}
        {tab === 'backup' && <BackupTab onAuthLost={onAuthLost} />}
      </div>
    </main>
  );
}
