# ECE Makerspace Wiki

The replacement for the legacy "Mastery Wiki" (`webtest2`): a Fumadocs-based
wiki where **documentation is Markdown you can edit from the browser**, and the
**live makerspace ops** (machine status, reports, component banks, filament
inventory, requests) run inside the same app — no database, no websockets,
nothing that breaks randomly.

## Stack

- **Bun** (package manager & runner) · **Next.js 16** (App Router) · **TypeScript**
- **Fumadocs v16** — docs theme, sidebar, dark mode, built-in search (ZBSearch)
- **MDX, compiled at runtime** from `content/docs/` — pages created or edited in
  the web UI appear on the next request, with **no rebuild and no restart**
- **JSON files in `data/`** — the entire live ops store (atomic writes)
- Tailwind CSS 4 · Green-API WhatsApp alerts (optional)

## Quick start

```bash
bun install
bun run dev        # dev server (auto-picks a free port)
```

Production:

```bash
bun run build
bun run start      # or: bun run start -- -p 3000
```

Default admin password: `exco2026` — **change it** via Admin → Settings (or set
`ADMIN_PASSWORD` before first boot). Copy `.env.example` to `.env` for
WhatsApp alerts.

## What's where

| Path | Purpose |
| --- | --- |
| `content/docs/` | The wiki: MDX pages + `meta.json` (sidebar order/icons). Edit on disk or at **`/edit`** |
| `data/` | Live ops state: machines, reports, requests, filament, banks, settings. Never overwritten by deploys that want to keep state |
| `app/docs/` | Docs pages — rendered per-request from `content/` (runtime compiler in `lib/source.ts`) |
| `app/api/` | Ops + content + auth APIs (all mutations admin-gated except member reports/requests) |
| `app/admin/`, `app/edit/` | Admin panel & web editor (password login) |
| `lib/` | Contracts (`types.ts`), runtime docs source, JSON store, auth (scrypt + signed cookie), WhatsApp notifier |
| `components/ops/`, `components/admin/`, `components/editor/` | Live-status widgets, admin tabs, editor UI |
| `webtest2/` | Legacy app kept as read-only reference (gitignored) |

## Editing content

Open **`/edit`** (login with the admin password): file tree, frontmatter helper
fields, CodeMirror editor, templates (blank / machine / workshop / rules),
create/save/delete, and a live preview link. Everything is MDX — custom
components included:

```mdx
<MachineStatus id="p1s-left" />   <!-- live status badge + QR -->
<Tabs items={['PLA', 'TPU']}>…</Tabs>
<Accordions><Accordion title="Clog">…</Accordion></Accordions>
<ComponentBank id="electronics-bank" />
<FilamentTable />
<YouTube url="https://youtu.be/…" title="Benchy removal" />
```

## Workshops

Workshop pages (see **`/docs/workshops`**) have an overview body **plus a run
checklist in frontmatter**:

```yaml
---
title: Induction Workshop
audience: new members
duration: 165
checklist:
  - id: ppe
    label: PPE briefing — goggles, tie hair back, no gloves
    section: 4 · Mechanical Tools
---
```

The checklist renders as an interactive widget: progress + per-item runner
notes are saved on the runner's device (localStorage), with a print view for
paper people. The induction content was adapted from the official Induction
Workshop v4 document.

## Ops features (parity with the legacy wiki)

- 4-state machine status; submitting a report auto-flags the machine
  "Needs Attention"
- Issue reports & component requests queues (public submission, admin triage)
- Filament inventory with low-stock (≤2) WhatsApp alerts
- 3 interactive component-bank grids (admin click-to-edit cells)
- QR code on every machine page (and print views) for physical posters
- Backup export/import (single JSON), password change, WhatsApp config
- Same-origin API: no CORS, no hardcoded IPs; mutations require the admin
  session cookie (scrypt-hashed password — no plaintext on disk)

Search covers all docs content and updates the moment a page is saved.

## Deploying

```bash
# on the server (any machine with bun ≥1.2, or node ≥24):
bun install
bun run build
ADMIN_PASSWORD='choose-one' bun run start -p 3000
```

Keep `data/` across deploys to preserve live state; the app only writes it at
runtime. Under PM2: `pm2 start bun --name wiki -- run start`. The legacy
deploy (`vite preview` + Express + Socket.IO on separate ports) is gone — one
process serves everything.
