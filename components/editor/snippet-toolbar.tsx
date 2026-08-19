'use client';

import { SNIPPETS, type Snippet } from './snippets';

interface SnippetToolbarProps {
  onInsert: (snippet: Snippet) => void;
}

/** Scrollable row of MDX snippet buttons shown above the editor. */
export function SnippetToolbar({ onInsert }: SnippetToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Insert MDX snippet"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-fd-border px-2 py-1.5"
    >
      <span className="shrink-0 pl-1 pr-1.5 text-xs font-medium text-fd-muted-foreground">
        Insert
      </span>
      {SNIPPETS.map((snippet) => {
        const Icon = snippet.icon;
        return (
          <button
            key={snippet.id}
            type="button"
            title={`Insert a ${snippet.label} snippet at the cursor`}
            onClick={() => onInsert(snippet)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-fd-border px-2 py-1 text-xs hover:bg-fd-accent"
          >
            <Icon className="size-3.5 text-fd-muted-foreground" />
            {snippet.label}
          </button>
        );
      })}
    </div>
  );
}
