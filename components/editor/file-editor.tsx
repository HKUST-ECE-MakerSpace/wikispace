'use client';

import { oneDark } from '@codemirror/theme-one-dark';
import { markdown } from '@codemirror/lang-markdown';
import { ExternalLink, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, type KeyboardEvent } from 'react';

import { parseFrontmatter, updateFrontmatter } from './frontmatter';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-fd-muted-foreground">Loading editor…</div>
  ),
});

/** Public docs URL for a content path, or null when it has no page (meta.json). */
export function viewPageUrl(path: string): string | null {
  const withoutExtension = path.replace(/\.(mdx|md)$/i, '');
  if (withoutExtension === path) return null;
  const segments = withoutExtension.split('/');
  if (segments[segments.length - 1] === 'index') segments.pop();
  return `/docs/${segments.join('/')}`;
}

interface FileEditorProps {
  path: string;
  value: string;
  dirty: boolean;
  saving: boolean;
  savedFlash: boolean;
  error: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onDelete: (path: string) => void;
}

export function FileEditor({
  path,
  value,
  dirty,
  saving,
  savedFlash,
  error,
  onChange,
  onSave,
  onDelete,
}: FileEditorProps) {
  const isJson = path.toLowerCase().endsWith('.json');
  const isMetaJson = path.split('/').pop() === 'meta.json';
  const fields = useMemo(() => parseFrontmatter(value), [value]);
  const viewHref = viewPageUrl(path);

  const handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (dirty && !saving) onSave();
    }
  };

  const patchField = (key: 'title' | 'description', next: string): void => {
    onChange(updateFrontmatter(value, { [key]: next }));
  };

  const confirmDelete = (): void => {
    if (!window.confirm(`Delete ${path}? This cannot be undone.`)) return;
    onDelete(path);
  };

  return (
    <section onKeyDown={handleKeyDown} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-fd-border px-4 py-2">
        <span className="truncate font-mono text-sm">
          {path}
          {dirty && <span className="ml-1 text-fd-primary" title="Unsaved changes">●</span>}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {savedFlash && <span className="text-sm font-medium text-fd-primary">Saved ✓</span>}
          {viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
            >
              View page <ExternalLink className="size-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="rounded-lg bg-fd-primary px-4 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={isMetaJson}
            title={isMetaJson ? 'meta.json cannot be deleted' : `Delete ${path}`}
            className="flex items-center gap-1 rounded-lg border border-fd-border px-3 py-1.5 text-sm text-red-600 hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="border-b border-fd-border bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {isJson ? (
        <p className="border-b border-fd-border px-4 py-1.5 text-xs text-fd-muted-foreground">
          JSON file — edit the raw text directly.
        </p>
      ) : (
        <div className="flex flex-col gap-2 border-b border-fd-border px-4 py-2 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-fd-muted-foreground">
            Title
            <input
              value={fields.title}
              disabled={!fields.editable}
              onChange={(event) => patchField('title', event.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5 text-sm text-fd-foreground disabled:opacity-50"
            />
          </label>
          <label className="flex min-w-0 flex-[2] flex-col gap-1 text-xs text-fd-muted-foreground">
            Description
            <input
              value={fields.description}
              disabled={!fields.editable}
              onChange={(event) => patchField('description', event.target.value)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5 text-sm text-fd-foreground disabled:opacity-50"
            />
          </label>
          {!fields.editable && (
            <p className="self-end text-xs text-fd-muted-foreground">
              Frontmatter is malformed — helper fields disabled, edit raw text below.
            </p>
          )}
        </div>
      )}

      <div className="min-h-[50vh] flex-1 overflow-hidden text-left">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[markdown()]}
          onChange={onChange}
        />
      </div>
    </section>
  );
}
