import {
  Boxes,
  CircleAlert,
  Cog,
  FileText,
  FlaskConical,
  Nut,
  Package,
  Presentation,
  Printer,
  ScrollText,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { Node, Root } from 'fumadocs-core/page-tree';

/**
 * meta.json / frontmatter `icon:` values are plain strings; the page tree
 * renderer needs actual React nodes or it prints the string verbatim
 * ("ZapSoldering"). Map every icon name used in content/docs to a component.
 */
const ICONS: Record<string, LucideIcon> = {
  Boxes,
  CircleAlert,
  Cog,
  FileText,
  FlaskConical,
  Nut,
  Package,
  Presentation,
  Printer,
  ScrollText,
  Wrench,
  Zap,
};

function resolveIcon(icon: ReactNode | undefined): ReactNode | undefined {
  if (typeof icon !== 'string') return icon;
  const Component = ICONS[icon];
  return Component ? <Component /> : undefined;
}

function withIcons(node: Node): Node {
  if (node.type === 'separator') return { ...node, icon: resolveIcon(node.icon) };
  if (node.type === 'folder') {
    return { ...node, icon: resolveIcon(node.icon), children: node.children.map(withIcons) };
  }
  return { ...node, icon: resolveIcon(node.icon) };
}

/** Deep-copy a page tree with string icons replaced by lucide components. */
export function applyTreeIcons(tree: Root): Root {
  return { ...tree, children: tree.children.map(withIcons) };
}
