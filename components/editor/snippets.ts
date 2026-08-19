import {
  Activity,
  Boxes,
  ChevronsUpDown,
  Columns2,
  FileCode,
  LayoutGrid,
  ListTree,
  MessageSquareWarning,
  Link2,
  ListOrdered,
  Table2,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * MDX snippets for the /edit toolbar. Each inserts correct scaffolding at the
 * CodeMirror cursor; `cursorOffset` lands the caret on the first thing to edit.
 * Components are auto-provided at compile time — snippets must never emit
 * `import` statements.
 */
export interface Snippet {
  id: string;
  label: string;
  icon: LucideIcon;
  /** MDX text inserted at the cursor. */
  text: string;
  /** Offset into `text` where the caret lands after inserting. */
  cursorOffset: number;
}

/** Caret offset of the first occurrence of `needle`, 0 when absent. */
const caretAt = (text: string, needle: string): number =>
  Math.max(0, text.indexOf(needle));

function snippet(
  id: string,
  label: string,
  icon: LucideIcon,
  text: string,
  needle: string,
): Snippet {
  return { id, label, icon, text, cursorOffset: caretAt(text, needle) };
}

const calloutText = `<Callout type="info">
  Callout text — switch to type="warn" for hazards.
</Callout>
`;

const tabsText = `<Tabs items={['First tab', 'Second tab']}>
  <Tab value="First tab">Content of the first tab.</Tab>
  <Tab value="Second tab">Content of the second tab.</Tab>
</Tabs>
`;

const accordionsText = `<Accordions>
  <Accordion title="Click to expand">
    Hidden body — repair steps, warnings, details.
  </Accordion>
</Accordions>
`;

const stepsText = `<Steps>
  <Step>First step.</Step>
  <Step>Second step.</Step>
</Steps>
`;

const cardsText = `<Cards>
  <Card title="Card title" description="One-line summary." href="/docs/machines" />
</Cards>
`;

const typeTableText = `<TypeTable
  type={{
    setting: { type: 'string', default: '0.2mm', description: 'What it controls' },
  }}
/>
`;

const linkText = '[Link text](./page-name.mdx)';

const frontmatterText = `---
title: Page Title
description: One-line summary shown in search results.
icon: FileText
---
`;

export const SNIPPETS: readonly Snippet[] = [
  snippet('tabs', 'Tabs', Columns2, tabsText, "First tab'"),
  snippet('callout', 'Callout', MessageSquareWarning, calloutText, 'Callout text'),
  snippet('accordions', 'Accordions', ChevronsUpDown, accordionsText, 'Click to expand'),
  snippet('steps', 'Steps', ListOrdered, stepsText, 'First step.'),
  snippet('cards', 'Cards', LayoutGrid, cardsText, 'Card title'),
  snippet('type-table', 'TypeTable', Table2, typeTableText, 'setting:'),
  snippet('machine-status', 'Status', Activity, '<MachineStatus id="j1s" />\n', 'j1s'),
  snippet('component-bank', 'CompBank', Boxes, '<ComponentBank id="electronics" />\n', 'electronics'),
  snippet('filament', 'Filament', ListTree, '<FilamentTable />\n', '<Filament'),
  snippet('youtube', 'YouTube', Video, '<YouTube url="https://youtu.be/VIDEO_ID" title="What the video shows" />\n', 'VIDEO_ID'),
  snippet('link', 'Link', Link2, linkText, 'Link text'),
  snippet('frontmatter', 'Frontmatter', FileCode, frontmatterText, 'Page Title'),
];
