/**
 * Page templates offered by the /edit "New page" flow. Plain strings, safe to
 * import from client code. Each `content` is a complete MDX file using the
 * components registered in components/mdx.tsx.
 */

export type TemplateKey = 'blank' | 'machine' | 'workshop' | 'rules';

export interface PageTemplate {
  label: string;
  defaultPath: string;
  content: string;
}

export const TEMPLATES: Record<TemplateKey, PageTemplate> = {
  blank: {
    label: 'Blank page',
    defaultPath: 'new-page.mdx',
    content: `---
title: New Page
description: One-line summary shown in search results and page listings
---

Write your page in Markdown. Wiki components work too — for example:

<Callout type="info">
  Callouts highlight anything members must not miss.
</Callout>
`,
  },
  machine: {
    label: 'Machine guide',
    defaultPath: 'machines/new-machine.mdx',
    content: `---
title: New Machine
description: Quick start, settings and maintenance for this machine
---

<MachineStatus id="new-machine" />

The status badge above is live — it reflects the ops dashboard state for this
machine id.

## Quick start

<Steps>
  <Step>Check the badge above is green (operational) before you begin.</Step>
  <Step>Power the machine on with the switch on the left side.</Step>
  <Step>Load your material and run a first pass on scrap.</Step>
  <Step>Clean the bed and switch off when you are done.</Step>
</Steps>

## Settings

<Tabs items={['Everyday', 'Advanced']}>
  <Tab>
    - Speed: 100%
    - Temperature: 210 °C
    - Use the default profile in the machine's memory.
  </Tab>
  <Tab>
    Ask an exec member before changing acceleration or firmware settings.
    Non-default profiles must be logged in the maintenance page.
  </Tab>
</Tabs>

## Common problems

<Callout type="warn">
  If the badge shows **down**, do not attempt repairs yourself — file a report
  from the ops dashboard instead.
</Callout>

<Accordions>
  <Accordion title="Prints stick too much">
    Let the bed cool to room temperature before removing parts. Use the
    spatula at the station, never a knife.
  </Accordion>
  <Accordion title="Filament jams">
    Unload the filament, cut a clean 45° tip, and reload. If it jams twice in
    a row, report it.
  </Accordion>
</Accordions>

## Walkthrough video

<YouTube url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Machine walkthrough" />
`,
  },
  workshop: {
    label: 'Workshop',
    defaultPath: 'workshops/new-workshop.mdx',
    content: `---
title: New Workshop
description: What this workshop covers and who it is for
duration: 60
audience: New members
checklist:
  - id: intro
    label: Welcome & safety briefing
    section: Introduction
  - id: rules
    label: Makerspace rules and booking system
    section: Introduction
  - id: tour
    label: Lab tour
    section: Hands-on
  - id: machine
    label: Guided first print or cut
    section: Hands-on
  - id: wrapup
    label: Questions and next steps
    section: Wrap-up
---

The checklist in this page's frontmatter renders in its own Checklist tab —
runners tick items off as the session progresses (deep-link it with
\`?tab=checklist\` on the URL). Each item needs an \`id\`
and \`label\`; \`section\` groups items under a heading.

## Before you run it

<Steps>
  <Step>Confirm the room booking and machine availability.</Step>
  <Step>Prepare one scrap piece and one good piece of material per attendee.</Step>
  <Step>Print the sign-in sheet and the QR code to this page.</Step>
</Steps>

<Callout type="info">
  Keep \`duration\` in minutes and \`audience\` to one short phrase — both are
  shown on the workshop listing.
</Callout>
`,
  },
  rules: {
    label: 'Rules page',
    defaultPath: 'rules.mdx',
    content: `---
title: Makerspace Rules
description: The rules every member agrees to — read before your first booking
---

<Callout type="warn">
  Breaking these rules can lose you lab access. If something here is unclear,
  ask an exec member before you act.
</Callout>

## Conduct

- Be excellent to each other. Harassment of any kind is not tolerated.
- The space is shared: your project does not outrank anyone else's.
- Report broken equipment — never quietly put it back.

## Safety

<Steps>
  <Step>Complete a workshop or orientation before using any machine alone.</Step>
  <Step>Wear safety glasses at the machines; tie back long hair.</Step>
  <Step>Never leave a running machine unattended.</Step>
</Steps>

## Access levels

<Accordions>
  <Accordion title="Level 1 — General member">
    3D printers (FDM), hand tools, soldering stations, and the component bank.
    Earned by attending any orientation workshop.
  </Accordion>
  <Accordion title="Level 2 — Certified operator">
    Laser cutter, resin printer, CNC. Requires the machine-specific workshop
    plus a signed-off supervised session.
  </Accordion>
  <Accordion title="Banned, always">
    Kiln, spray paint, and anything producing fumes without an exec present
    and the extraction running.
  </Accordion>
</Accordions>
`,
  },
};
