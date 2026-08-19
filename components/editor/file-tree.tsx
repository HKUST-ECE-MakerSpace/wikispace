'use client';

import { ChevronRight, FileText, FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { TEMPLATES, type TemplateKey } from '@/lib/templates';

export interface TreeFile {
  path: string;
  title: string;
}

interface DirNode {
  kind: 'dir';
  name: string;
  path: string;
  children: TreeNode[];
}

interface FileNode {
  kind: 'file';
  name: string;
  path: string;
  title: string;
}

type TreeNode = DirNode | FileNode;

function buildTree(files: TreeFile[]): DirNode {
  const root: DirNode = { kind: 'dir', name: '', path: '', children: [] };
  for (const file of files) {
    const segments = file.path.split('/');
    let dir = root;
    for (let depth = 0; depth < segments.length - 1; depth++) {
      const existing = dir.children.find(
        (child): child is DirNode => child.kind === 'dir' && child.name === segments[depth],
      );
      if (existing) {
        dir = existing;
      } else {
        const next: DirNode = {
          kind: 'dir',
          name: segments[depth],
          path: segments.slice(0, depth + 1).join('/'),
          children: [],
        };
        dir.children.push(next);
        dir = next;
      }
    }
    dir.children.push({
      kind: 'file',
      name: segments[segments.length - 1],
      path: file.path,
      title: file.title,
    });
  }

  const sortLevel = (node: DirNode): void => {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    for (const child of node.children) if (child.kind === 'dir') sortLevel(child);
  };
  sortLevel(root);
  return root;
}

interface FileTreeProps {
  files: TreeFile[];
  activePath: string | null;
  error: string;
  /** Create-form visibility is owned by the app so the top bar can open it. */
  createOpen: boolean;
  onToggleCreate: (open: boolean) => void;
  onSelect: (path: string) => void;
  onCreate: (path: string, template: TemplateKey) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function FileTree({
  files,
  activePath,
  error,
  createOpen,
  onToggleCreate,
  onSelect,
  onCreate,
  onRefresh,
}: FileTreeProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [template, setTemplate] = useState<TemplateKey>('blank');
  const [newPath, setNewPath] = useState(TEMPLATES.blank.defaultPath);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const tree = useMemo(() => buildTree(files), [files]);

  const toggle = (path: string): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const pickTemplate = (key: TemplateKey): void => {
    setTemplate(key);
    setNewPath(TEMPLATES[key].defaultPath);
  };

  const submitCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = newPath.trim().replace(/^\/+/, '').replace(/\\/g, '');
    setCreating(true);
    setCreateError('');
    try {
      await onCreate(trimmed, template);
      onToggleCreate(false);
      setNewPath(TEMPLATES[template].defaultPath);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Could not create the file');
    } finally {
      setCreating(false);
    }
  };

  const renderNode = (node: TreeNode, depth: number): ReactNode => {
    if (node.kind === 'dir') {
      const isCollapsed = collapsed.has(node.path);
      return (
        <li key={node.path}>
          <button
            type="button"
            onClick={() => toggle(node.path)}
            className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-fd-accent"
            style={{ paddingLeft: depth * 14 + 8 }}
          >
            <ChevronRight
              className={`size-3.5 shrink-0 text-fd-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            />
            <FolderOpen className="size-4 shrink-0 text-fd-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </button>
          {!isCollapsed && (
            <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>
          )}
        </li>
      );
    }

    const isActive = node.path === activePath;
    return (
      <li key={node.path}>
        <button
          type="button"
          title={node.title}
          onClick={() => onSelect(node.path)}
          className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-fd-accent ${isActive ? 'bg-fd-accent font-medium text-fd-accent-foreground' : ''}`}
          style={{ paddingLeft: depth * 14 + 22 }}
        >
          <FileText className="size-4 shrink-0 text-fd-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
      </li>
    );
  };

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col border-fd-border md:w-72 md:flex-none md:border-r">
      <div className="flex shrink-0 items-center gap-2 border-b border-fd-border px-3 py-2">
        <h2 className="text-sm font-semibold">Pages</h2>
        <span className="text-xs text-fd-muted-foreground">{files.length}</span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            title="Refresh file list"
            onClick={() => void onRefresh()}
            className="rounded-md p-1.5 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleCreate(!createOpen)}
            className="flex items-center gap-1 rounded-md border border-fd-border px-2 py-1 text-xs font-medium hover:bg-fd-accent"
          >
            <Plus className="size-3.5" /> New page
          </button>
        </div>
      </div>

      {createOpen && (
        <form
          onSubmit={(event) => void submitCreate(event)}
          className="flex shrink-0 flex-col gap-2 border-b border-fd-border bg-fd-card px-3 py-2.5"
        >
          <label className="flex flex-col gap-1 text-xs text-fd-muted-foreground">
            Template
            <select
              value={template}
              onChange={(event) => pickTemplate(event.target.value as TemplateKey)}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5 text-sm text-fd-foreground"
            >
              {Object.entries(TEMPLATES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-fd-muted-foreground">
            Path (relative to content/docs)
            <input
              value={newPath}
              onChange={(event) => setNewPath(event.target.value)}
              placeholder="machines/my-machine.mdx"
              spellCheck={false}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-1.5 font-mono text-sm text-fd-foreground"
            />
          </label>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || newPath.trim().length === 0}
              className="rounded-md bg-fd-primary px-3 py-1.5 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => onToggleCreate(false)}
              className="rounded-md border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="shrink-0 border-b border-fd-border px-3 py-2 text-xs text-red-500">{error}</p>}

      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        <ul>{tree.children.map((child) => renderNode(child, 0))}</ul>
      </nav>
    </aside>
  );
}
