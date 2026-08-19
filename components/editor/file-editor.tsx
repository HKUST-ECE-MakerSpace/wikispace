'use client';

import { oneDark } from '@codemirror/theme-one-dark';
import { markdown } from '@codemirror/lang-markdown';
import type { EditorView } from '@codemirror/view';
import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';

import { parseFrontmatter, updateFrontmatter } from './frontmatter';
import { SnippetToolbar } from './snippet-toolbar';
import type { Snippet } from './snippets';

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
  error: string;
  onChange: (next: string) => void;
}

/**
 * Center pane of the editor: snippet toolbar, frontmatter helper fields and
 * the CodeMirror buffer. Save/delete/live-preview chrome lives in the app's
 * sticky top bar instead.
 */
export function FileEditor({ path, value, error, onChange }: FileEditorProps) {
  const isJson = path.toLowerCase().endsWith('.json');
  const fields = useMemo(() => parseFrontmatter(value), [value]);
  const viewRef = useRef<EditorView | null>(null);

  const insertSnippet = (snippet: Snippet): void => {
    const view = viewRef.current;
    if (!view) {
      onChange(`${value}\n${snippet.text}`);
      return;
    }
    const pos = view.state.selection.main.head;
    // Block components must start on their own line — MDX parses them as
    // inline text (and fails) when glued onto a paragraph.
    const line = view.state.doc.lineAt(pos);
    const midParagraph = line.text.slice(0, pos - line.from).trim() !== '';
    const prefix = snippet.text.startsWith('<') && midParagraph ? '\n\n' : '';
    view.dispatch({
      changes: { from: pos, insert: prefix + snippet.text },
      selection: { anchor: pos + prefix.length + snippet.cursorOffset },
    });
    view.focus();
  };

  const patchField = (field: 'title' | 'description', next: string): void => {
    onChange(updateFrontmatter(value, { [field]: next }));
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {error && (
        <p className="border-b border-fd-border bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!isJson && <SnippetToolbar onInsert={insertSnippet} />}

      {isJson ? (
        <p className="shrink-0 border-b border-fd-border px-4 py-1.5 text-xs text-fd-muted-foreground">
          JSON file — edit the raw text directly; no live preview.
        </p>
      ) : (
        <div className="flex shrink-0 flex-col gap-2 border-b border-fd-border px-4 py-2 sm:flex-row">
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

      <div className="min-h-0 flex-1 overflow-hidden text-left">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[markdown()]}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
        />
      </div>
    </section>
  );
}
