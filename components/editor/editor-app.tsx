'use client';

import {
  ExternalLink,
  Eye,
  EyeOff,
  FilePlus2,
  Lock,
  LogOut,
  PanelLeft,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { TEMPLATES, type TemplateKey } from '@/lib/templates';

import { FileEditor, viewPageUrl } from './file-editor';
import { FileTree, type TreeFile } from './file-tree';
import { PreviewPane } from './preview-pane';

type Session = 'checking' | 'signed-out' | 'ready';
type MobileTab = 'files' | 'edit' | 'preview';

/** Below this width the three panes collapse into tabs. */
const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = (): void => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

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

  const [treeOpen, setTreeOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const isMobile = useIsMobile();

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
    const response = await api('/api/content/tree', { cache: 'no-store' });
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

  const dirty = openPath !== null && content !== savedContent;

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

  // ⌘S / Ctrl+S saves from anywhere in the editor, CodeMirror included.
  useEffect(() => {
    if (session !== 'ready') return;
    const handler = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (openPath !== null && content !== savedContent && !saving) void save();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [session, openPath, content, savedContent, saving, save]);

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
      <div className="flex h-dvh flex-col items-center justify-center gap-6 px-6 py-16">
        <a
          href="/"
          className="text-sm text-fd-muted-foreground hover:text-fd-foreground hover:underline"
        >
          ← Back to home
        </a>
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

  const isMarkdown = openPath !== null && /\.(mdx|md)$/i.test(openPath);
  const viewHref = openPath === null ? null : viewPageUrl(openPath);
  const isMetaJson = openPath !== null && openPath.split('/').pop() === 'meta.json';

  const showTree = isMobile ? mobileTab === 'files' : treeOpen;
  const showEditor = !isMobile || mobileTab === 'edit';
  const previewActive = previewOn && isMarkdown && openPath !== null;
  const showPreview = previewActive && (!isMobile || mobileTab === 'preview');

  const selectFile = (path: string): void => {
    setMobileTab('edit');
    void openFile(path);
  };

  const startCreate = (): void => {
    setCreateOpen(true);
    if (isMobile) setMobileTab('files');
    else setTreeOpen(true);
  };

  const confirmDelete = (): void => {
    if (openPath === null || isMetaJson) return;
    if (!window.confirm(`Delete ${openPath}? This cannot be undone.`)) return;
    void deleteFile(openPath);
  };

  let editorBody: ReactNode;
  if (loadingFile) {
    editorBody = (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-fd-muted-foreground">
        Loading {openPath ?? ''}…
      </div>
    );
  } else if (openPath === null) {
    editorBody = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-fd-muted-foreground">
        <p className="text-sm">Select a page from the file list, or start a new one.</p>
        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-1.5 rounded-lg border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
        >
          <FilePlus2 className="size-4" /> New from template
        </button>
        <p className="text-xs">Edits go live immediately after saving.</p>
      </div>
    );
  } else {
    editorBody = (
      <FileEditor
        key={openPath}
        path={openPath}
        value={content}
        error={fileError}
        onChange={setContent}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-fd-border bg-fd-background px-3 py-2">
        <a
          href="/"
          className="rounded-md px-1.5 py-1 text-sm font-medium text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
        >
          ← Home
        </a>
        {!isMobile && (
          <button
            type="button"
            onClick={() => setTreeOpen((previous) => !previous)}
            title={treeOpen ? 'Hide the file tree' : 'Show the file tree'}
            className={`rounded-md p-1.5 hover:bg-fd-accent ${treeOpen ? 'text-fd-foreground' : 'text-fd-muted-foreground'}`}
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <span className="ml-1 min-w-0 max-w-[40%] truncate font-mono text-sm">
          {openPath ?? 'No file selected'}
          {dirty && (
            <span className="ml-1 text-fd-primary" title="Unsaved changes">
              ●
            </span>
          )}
        </span>
        <span className="text-xs text-fd-muted-foreground" aria-live="polite">
          {saving ? (
            'Saving…'
          ) : savedAt !== null ? (
            <span className="font-medium text-fd-primary">Saved ✓</span>
          ) : dirty ? (
            'Unsaved changes'
          ) : (
            ''
          )}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              title={`Open the published page (${viewHref})`}
              className="hidden items-center gap-1 rounded-lg border border-fd-border px-2.5 py-1.5 text-sm hover:bg-fd-accent sm:flex"
            >
              View <ExternalLink className="size-3.5" />
            </a>
          )}
          {isMarkdown && (
            <button
              type="button"
              onClick={() => setPreviewOn((previous) => !previous)}
              aria-pressed={previewOn}
              title="Toggle the live preview pane"
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm ${
                previewOn
                  ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                  : 'border-fd-border hover:bg-fd-accent'
              }`}
            >
              {previewOn ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}
          <button
            type="button"
            onClick={startCreate}
            title="Create a new page from a template"
            className="flex items-center gap-1 rounded-lg border border-fd-border px-2.5 py-1.5 text-sm hover:bg-fd-accent"
          >
            <FilePlus2 className="size-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={openPath === null || isMetaJson}
            title={
              openPath === null
                ? 'Open a file first'
                : isMetaJson
                  ? 'meta.json cannot be deleted'
                  : `Delete ${openPath}`
            }
            className="flex items-center gap-1 rounded-lg border border-fd-border px-2.5 py-1.5 text-sm text-red-600 hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            title="Save (⌘S / Ctrl+S)"
            className="flex items-center gap-1.5 rounded-lg bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            <Save className="size-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            title="Log out"
            className="rounded-lg p-2 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {isMobile && (
        <div
          role="tablist"
          aria-label="Editor panes"
          className="flex shrink-0 border-b border-fd-border"
        >
          {(
            [
              ['files', 'Files'],
              ['edit', 'Edit'],
              ['preview', 'Preview'],
            ] as const
          ).map(([tab, label]) => {
            const disabled = tab === 'preview' && !isMarkdown;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mobileTab === tab}
                disabled={disabled}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 border-b-2 py-2 text-sm font-medium disabled:opacity-40 ${
                  mobileTab === tab
                    ? 'border-fd-primary text-fd-primary'
                    : 'border-transparent text-fd-muted-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showTree && (
          <FileTree
            files={files}
            activePath={openPath}
            error={treeError}
            createOpen={createOpen}
            onToggleCreate={setCreateOpen}
            onSelect={selectFile}
            onCreate={createFile}
            onRefresh={refreshTree}
          />
        )}
        <section
          className={`min-h-0 min-w-0 w-full flex-1 flex-col md:flex ${showEditor ? 'flex' : 'hidden'}`}
        >
          {editorBody}
        </section>
        <div
          className={`${showPreview ? 'flex' : 'hidden'} min-h-0 min-w-0 w-full flex-col md:w-[38%] md:shrink-0 md:border-l md:border-fd-border`}
        >
          <PreviewPane
            path={openPath ?? ''}
            content={content}
            active={previewActive}
            api={api}
          />
        </div>
      </div>
    </div>
  );
}
