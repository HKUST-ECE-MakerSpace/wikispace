# ECE Makerspace Wiki

The wiki and ops dashboard of the [HKUST ECE Makerspace](https://github.com/HKUST-ECE-MakerSpace),
served at **[wiki.ecemaker.space](https://wiki.ecemaker.space)**.

Documentation is **Markdown you can edit from the browser** — pages are compiled
at runtime, so anything saved in the web editor is live on the next request,
with no rebuild and no restart. The **live makerspace ops** (machine status,
issue reports, component banks, filament inventory, requests) run inside the
same app: no database, no websockets, nothing that breaks randomly.

Built by exco, for exco — one process serves the whole space.

## Features

**Wiki**

- MDX pages with browser editor ([`/edit`](/edit)): file tree, templates,
  CodeMirror, live preview, ⌘S to publish
- Fumadocs theme: sidebar with icons and separators, dark mode, full-text
  search that updates the moment a page is saved
- Custom MDX components for makerspace content — live widgets, tabs,
  accordions, steps, callouts, embedded video (see the in-app
  [writing guide](/docs/writing-guide))
- Interactive workshop pages: checklists declared in frontmatter render as a
  tickable run sheet with per-device progress and a print view
- `llms.txt` / `llms-full.txt` endpoints and per-page Markdown export for
  LLMs and humans alike

**Ops**

- 4-state live machine status on every machine page; submitting a report
  auto-flags the machine "Needs Attention"
- Public issue-report and component-request forms (no login) with admin triage
  queues, plus optional WhatsApp alerts to exco via Green API
- Three interactive component-bank grids mirroring the physical drawer layout
  (admin click-to-edit cells)
- Filament inventory with low-stock WhatsApp alerts
- QR code on every machine page for physical posters — scan, land on the guide
- Admin panel: backup export/import (single JSON), password change, WhatsApp
  config

## Stack

| Piece | Choice |
| --- | --- |
| Runtime | Bun (or Node ≥ 24) |
| Framework | Next.js 16 (App Router), TypeScript |
| Docs | Fumadocs v16 — MDX compiled at runtime from `content/docs/` |
| State | JSON files in `data/` (atomic writes, auto-seeded) |
| Styling | Tailwind CSS 4 |
| Alerts | Green API (WhatsApp, optional) |

## Quick start

```bash
bun install
bun run dev        # dev server (auto-picks a free port)
```

Production:

```bash
bun run build
ADMIN_PASSWORD='choose-one' bun run start -p 3000
```

Default admin password is `exco2026` — **change it** on first boot via Admin →
Settings, or set `ADMIN_PASSWORD` in the environment before the first start.
The password is stored scrypt-hashed; it is never kept in plaintext.

Copy `.env.example` to `.env` to enable WhatsApp alerts:

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Admin password used when `data/` is first seeded |
| `GREEN_API_INSTANCE_ID` | Green API instance for WhatsApp alerts |
| `GREEN_API_TOKEN` | Green API auth token |
| `WHATSAPP_GROUP_ID` | Group chat that receives alerts |

## What's where

| Path | Purpose |
| --- | --- |
| `content/docs/` | The wiki: MDX pages + `meta.json` (sidebar order/icons). Edit on disk or in the browser at `/edit` |
| `app/docs/` | Docs pages — rendered per-request from `content/` (runtime compiler in `lib/source.ts`) |
| `app/api/` | Ops + content + auth APIs (all mutations admin-gated except member reports/requests) |
| `app/admin/`, `app/edit/` | Admin panel & web editor (password login) |
| `components/ops/`, `components/admin/`, `components/editor/` | Live-status widgets, admin tabs, editor UI |
| `lib/` | Contracts (`types.ts`), runtime docs source, JSON store, auth, WhatsApp notifier |
| `data/` | Live ops state — **gitignored**. Auto-seeded on first boot; after that it holds the hashed admin password and session secret, so it is never committed |

## Editing content

Open **`/edit`** (login with the admin password): file tree, frontmatter helper
fields, CodeMirror editor, templates (blank / machine / workshop / rules),
create/save/delete, and a live preview that renders an unpublished draft.
Everything is MDX — custom components included:

```mdx
<MachineStatus id="p1s-left" />   <!-- live status badge + QR -->
<Tabs items={['PLA', 'TPU']}>…</Tabs>
<Accordions><Accordion title="Clog">…</Accordion></Accordions>
<ComponentBank id="electronics-bank" />
<FilamentTable />
<YouTube url="https://youtu.be/…" title="Benchy removal" />
```

The full authoring reference (frontmatter, components, sidebar ordering,
naming rules) lives in the wiki itself at **`/docs/writing-guide`**.

## Workshops

Workshop pages have an overview body **plus a run checklist in frontmatter**:

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

The page renders with **Overview** and **Checklist** tabs: progress and
per-item runner notes are saved on the runner's device (localStorage), with a
print view for paper people and a `?tab=checklist` deep link for runner QR
codes. The induction content was adapted from the official Induction Workshop
v4 document.

## Security model

- Same-origin API, no CORS, no hardcoded IPs
- Mutations require the admin session cookie: scrypt-hashed password,
  HMAC-signed cookie with a per-instance random `sessionSecret`
- Public endpoints are limited to submitting reports/requests and reading
  live status
- `data/settings.json` (hash + secret) is gitignored and never leaves the host;
  backups are exported explicitly from the admin panel

## Deploying

Any host with Bun ≥ 1.2 (or Node ≥ 24):

```bash
bun install
bun run build
ADMIN_PASSWORD='choose-one' bun run start -p 3000
```

Keep `data/` across deploys to preserve live state — the app only writes it at
runtime. Under PM2: `pm2 start bun --name wiki -- run start`.

On NixOS (how `wiki.ecemaker.space` is deployed), this repo is a flake that
exposes both the package and a `services.wiki` module:

```nix
# flake input — public repo, no token needed
wikispace.url = "github:HKUST-ECE-MakerSpace/wikispace";
```

```nix
# host config
imports = [ inputs.wikispace.nixosModules.default ];
services.wiki = {
  enable = true;
  port = 3001;
  environment.ADMIN_PASSWORD = "…"; # seeds data/settings.json on first boot
};
services.caddy.virtualHosts."wiki.ecemaker.space" = {
  extraConfig = ''
    handle {
      reverse_proxy localhost:3001
    }
  '';
};
```

The module runs the standalone Next.js server as a hardened, dynamic-user
systemd service. Wiki content and ops state live in `/var/lib/wiki`
(`WIKI_CONTENT_DIR` / `WIKI_DATA_DIR` overrides) — seeded from the package on
first boot, then owned by the web editor and ops dashboard. Deploying an
update is `nix flake update wikispace && nixos-rebuild switch`.

One process serves everything — docs, ops, editor and admin. The legacy stack
(`vite preview` + Express + Socket.IO on separate ports) is gone.

## Backups

Admin → Backup exports every collection and setting as a single JSON file and
re-imports it the same way. On the host, backing up the `data/` directory is
equivalent — it is the entire live state.

## Updating the deployment

Everything mutable lives in `/var/lib/wiki` on the host — outside the Nix
store — so updating (or rebooting) never touches it:

- `content/docs/` is seeded from the package **only when empty**. Once the
  wiki has been edited via `/edit`, the live pages are authoritative: content
  changes pushed to this repo do **not** propagate to a deployed instance.
  Push content changes by editing the live wiki (or copying MDX into
  `/var/lib/wiki/content/docs/`).
- `data/*.json` files are seeded only when missing. Reports, machine status,
  filament, banks, the WhatsApp config and `settings.json` (which holds the
  scrypt password hash and the session secret) survive every update.
- `ADMIN_PASSWORD` only matters on first boot; after that the hash in
  `settings.json` is authoritative and password changes are made in
  Admin → Settings.

To deploy a new version of the app:

```bash
git push                     # this repo
# then on the server:
cd /etc/nixos
sudo git pull
sudo nix flake update wikispace
sudo nixos-rebuild switch --flake /etc/nixos#eez156
```

Whenever the app source changes (not just dependencies), the two `appHash`
values in `package.nix` must be re-pinned first — the hash pins the whole
build:

1. Reset both hashes in `package.nix` to `sha256-AAAA…=` and push.
2. On macOS run `nix build .#default`, on the server run
   `nix build github:HKUST-ECE-MakerSpace/wikispace#default`; each fails with
   a hash mismatch showing the real `got:` sha256 for that platform.
3. Paste them into the matching `appHash` branches, commit, push.

Resetting the placeholder first matters: a still-valid output under the old
hash makes Nix silently serve the stale build instead of rebuilding.
README and LICENSE are excluded from the build source, so doc-only edits
never need re-pinning.

## License

[MIT](./LICENSE) — HKUST ECE MakerSpace.
