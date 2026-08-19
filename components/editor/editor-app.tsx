'use client';

import { LogOut, Lock } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { TEMPLATES, type TemplateKey } from '@/lib/templates';

import { FileEditor } from './file-editor';
import { FileTree, type TreeFile } from './file-tree';

type Session = 'checking' | 'signed-out' | 'ready';

export function EditorApp() {
  const [session, setSession] = useState<Session>('checking');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [files, setFiles] = useState<TreeFile[]>([]);
  const [treeError, setTreeError] = useState('');
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [fileError, setFileError] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json() as Promise<{ authenticated: boolean }>)
      .then((data) => setSession(data.authenticated ? 'ready' : 'signed-out'))
      .catch(() => setSession('signed-out'));
  }, []);

  // "Saved ✓" flash: cleared shortly after each successful save.
  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), 2500);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  /** Fetch wrapper: any 401 kicks us back to the login gate. */
  const api = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const response = await fetch(url, init);
    if (response.status === 401) setSession('signed-out');
    return response;
  }, []);

  const refreshTree = useCallback(async (): Promise<void> => {
    const response = await api('/api/content/tree');
    if (response.status === 401) return;
    if (!response.ok) {
      setTreeError(`Could not load the file list (${response.status})`);
      return;
    }
    const data = (await response.json()) as { files: TreeFile[] };
    setFiles(data.files);
    setTreeError('');
  }, [api]);

  useEffect(() => {
    if (session === 'ready') void refreshTree();
  }, [session, refreshTree]);

  const openFile = useCallback(
    async (path: string): Promise<void> => {
      setLoadingFile(true);
      setFileError('');
      try {
        const response = await api(`/api/content/file?path=${encodeURIComponent(path)}`);
        if (!response.ok) {
          // Deleted or renamed elsewhere — drop it from the editor and resync.
          setOpenPath(null);
          void refreshTree();
          return;
        }
        const data = (await response.json()) as { content: string };
        setOpenPath(path);
        setContent(data.content);
        setSavedContent(data.content);
      } finally {
        setLoadingFile(false);
      }
    },
    [api, refreshTree],
  );

  const save = useCallback(async (): Promise<void> => {
    if (openPath === null || content === savedContent || saving) return;
    setSaving(true);
    setFileError('');
    try {
      const response = await api('/api/content/file', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: openPath, content }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setFileError(data.error ?? `Save failed (${response.status})`);
        return;
      }
      setSavedContent(content);
      setSavedAt(Date.now());
      void refreshTree(); // frontmatter title may have changed
    } finally {
      setSaving(false);
    }
  }, [api, content, openPath, refreshTree, savedContent, saving]);

  const createFile = useCallback(
    async (path: string, template: TemplateKey): Promise<void> => {
      const response = await api('/api/content/file', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, content: TEMPLATES[template].content }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not create the file (${response.status})`);
      }
      await refreshTree();
      await openFile(path);
    },
    [api, openFile, refreshTree],
  );

  const deleteFile = useCallback(
    async (path: string): Promise<void> => {
      setFileError('');
      const response = await api(`/api/content/file?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setFileError(data.error ?? `Delete failed (${response.status})`);
        void refreshTree();
        return;
      }
      if (openPath === path) {
        setOpenPath(null);
        setContent('');
        setSavedContent('');
      }
      await refreshTree();
    },
    [api, openPath, refreshTree],
  );

  const logout = async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setSession('signed-out');
    setOpenPath(null);
    setFiles([]);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setLoginError('Wrong password — try again.');
        return;
      }
      setPassword('');
      setSession('ready');
    } catch {
      setLoginError('Login failed — check your connection and retry.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (session === 'checking') {
    return (
      <div className="flex flex-1 items-center justify-center text-fd-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (session === 'signed-out') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-fd-primary/10 text-fd-primary">
          <Lock className="size-6" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold">Content editor</h1>
          <p className="mt-1 text-sm text-fd-muted-foreground">
            Sign in with the admin password to edit wiki pages.
          </p>
        </div>
        <form
          onSubmit={(event) => void submitLogin(event)}
          className="flex w-full max-w-xs flex-col gap-3"
        >
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            className="rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm"
          />
          {loginError && <p className="text-sm text-red-500">{loginError}</p>}
          <button
            type="submit"
            disabled={loggingIn || password.length === 0}
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const dirty = content !== savedContent;

  return (
    <div className="flex flex-1 flex-col md:h-screen md:overflow-hidden">
      <header className="flex items-center gap-3 border-b border-fd-border px-4 py-2">
        <h1 className="text-sm font-semibold">Content editor</h1>
        <span className="text-xs text-fd-muted-foreground">content/docs</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="ml-auto flex items-center gap-1 rounded-lg border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
        >
          <LogOut className="size-3.5" /> Log out
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <FileTree
          files={files}
          activePath={openPath}
          error={treeError}
          onSelect={(path) => void openFile(path)}
          onCreate={createFile}
          onRefresh={refreshTree}
        />
        {loadingFile ? (
          <div className="flex flex-1 items-center justify-center text-fd-muted-foreground">
            Loading {openPath ?? ''}…
          </div>
        ) : openPath === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-fd-muted-foreground">
            <p>Select a page on the left, or create a new one.</p>
            <p className="text-xs">Edits go live immediately after saving.</p>
          </div>
        ) : (
          <FileEditor
            key={openPath}
            path={openPath}
            value={content}
            dirty={dirty}
            saving={saving}
            savedFlash={savedAt !== null}
            error={fileError}
            onChange={setContent}
            onSave={() => void save()}
            onDelete={(path) => void deleteFile(path)}
          />
        )}
      </div>
    </div>
  );
}
