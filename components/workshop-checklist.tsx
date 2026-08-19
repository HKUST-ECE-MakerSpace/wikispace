'use client';

import { useEffect, useState } from 'react';
import type { ChecklistItem } from '@/lib/types';

interface ChecklistState {
  /** itemId -> done */
  done: Record<string, boolean>;
  /** itemId -> runner note */
  notes: Record<string, string>;
}

const EMPTY: ChecklistState = { done: {}, notes: {} };

function storageKey(pageUrl: string): string {
  return `workshop-checklist:${pageUrl}`;
}

function loadState(pageUrl: string): ChecklistState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(pageUrl));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ChecklistState>;
    return {
      done: parsed.done ?? {},
      notes: parsed.notes ?? {},
    };
  } catch {
    return EMPTY;
  }
}

function sections(items: ChecklistItem[]): { name: string; items: ChecklistItem[] }[] {
  const groups = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const name = item.section ?? '';
    const list = groups.get(name);
    if (list) list.push(item);
    else groups.set(name, [item]);
  }
  return [...groups.entries()].map(([name, list]) => ({ name, items: list }));
}

/**
 * Interactive runner checklist for workshop pages. Progress and per-item
 * notes persist in the browser (localStorage, keyed by page URL) so a
 * workshop runner can tick items off on a phone or tablet.
 */
export function WorkshopChecklist({
  pageUrl,
  items,
  durationMin,
  audience,
}: {
  pageUrl: string;
  items: ChecklistItem[];
  durationMin?: number;
  audience?: string;
}) {
  const [state, setState] = useState<ChecklistState>(EMPTY);

  useEffect(() => {
    setState(loadState(pageUrl));
  }, [pageUrl]);

  function update(next: ChecklistState) {
    setState(next);
    window.localStorage.setItem(storageKey(pageUrl), JSON.stringify(next));
  }

  function toggle(id: string) {
    update({ ...state, done: { ...state.done, [id]: !state.done[id] } });
  }

  function setNote(id: string, note: string) {
    update({ ...state, notes: { ...state.notes, [id]: note } });
  }

  const doneCount = items.filter((item) => state.done[item.id]).length;
  const pct = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return (
    <section className="not-prose my-6 rounded-xl border border-fd-border bg-fd-card p-4 md:p-6 print:border-black print:bg-white">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-semibold">Run checklist</h2>
          <p className="text-sm text-fd-muted-foreground">
            For whoever is running this workshop — progress is saved on this device.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-fd-muted-foreground">
            {doneCount}/{items.length} · {pct}%
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => update(EMPTY)}
            className="rounded-md border border-fd-border px-3 py-1.5 text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </header>

      {(durationMin || audience) && (
        <p className="mb-4 text-sm text-fd-muted-foreground">
          {audience ? <>Audience: {audience} · </> : null}
          {durationMin ? <>~{durationMin} min</> : null}
        </p>
      )}

      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-fd-muted-foreground/20 print:hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-fd-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-4">
        {sections(items).map((group) => (
          <li key={group.name}>
            {group.name ? (
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fd-muted-foreground">
                {group.name}
              </h3>
            ) : null}
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-fd-border/60 p-3 print:border-black print:p-2"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(state.done[item.id])}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span
                      className={
                        state.done[item.id]
                          ? 'text-fd-muted-foreground line-through'
                          : undefined
                      }
                    >
                      {item.label}
                    </span>
                  </label>
                  <input
                    value={state.notes[item.id] ?? ''}
                    onChange={(e) => setNote(item.id, e.target.value)}
                    placeholder="Runner note (optional)…"
                    className="mt-2 w-full rounded-md border border-fd-border/60 bg-fd-background px-2 py-1 text-sm placeholder:text-fd-muted-foreground/70 print:hidden"
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
