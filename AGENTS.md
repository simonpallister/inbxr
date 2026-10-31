# AGENTS.md

## Commands

- **Dev server (Web + SMTP)**: `npm run dev` (`node --no-warnings server.ts` — Web UI on `:3000`, SMTP catch-all on `:2525`)
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Production build**: `npm run build` (`next build`)
- **Production start**: `npm run start` (`NODE_ENV=production node --no-warnings server.ts`)

## Runtime & Architecture Constraints

- **Node >= 22.13 required**: The database layer (`src/lib/db.ts`) uses Node's built-in `node:sqlite` (`DatabaseSync`) and `server.ts` executes directly via Node 22 native TypeScript stripping (`node --no-warnings server.ts`). Do not introduce native C++ addons like `better-sqlite3` or external TypeScript runners (`tsx`), as `npm` install-scripts are blocked in this environment.
- **Single-process architecture (`server.ts`)**: Next.js and `smtp-server` run in the same Node process. When `smtp-server` receives an email (`onData`), it forwards the raw RFC822 MIME buffer via local HTTP `POST http://127.0.0.1:${port}/api/inbound` with `x-envelope-to` so the Next.js route handler owns all SQLite writes and triggers the in-process `globalThis.__mailEventBus` (`src/lib/events.ts`) for live SSE clients (`GET /api/stream`).
- **Mailparser `List-Unsubscribe` quirk**: `mailparser` normalizes `List-Unsubscribe` into a structured `parsed.headers.get("list")` object instead of keeping a flat `"list-unsubscribe"` string key. Keep the fallback logic in `src/lib/mail-ingest.ts` that reads both `parsed.headers.get("list")` and the raw MIME header.
- **Email rendering & tracking pixels**: Emails render in an isolated `<iframe srcDoc>` in `src/components/EmailReaderPane.tsx` only when selected in the reading pane so 1x1 open-tracking pixels fire on open, not on list load.
- **Vanity-only outbound UI**: Compose, Reply, Forward, and the `Sent`/`Drafts` folders are intentionally inert vanity UI for live demos—do not wire outbound SMTP sending.

## Production Deployment (Hostinger VPS)

- **GitHub Repo**: `https://github.com/simonpallister/inbxr` (`main` branch)
- **VPS Location**: `/opt/inbxr` on host `187.127.122.191` (accessible via `ssh-vps` MCP tools)
- **Container & Ports**: `docker-compose.yml` runs container `inbxr` mapping `127.0.0.1:3010->3000` (HTTP) and `0.0.0.0:25->25` (SMTP), with SQLite persisted in `/opt/inbxr/data/mail.db`.
- **Reverse Proxy**: Host-level Caddy (`/etc/caddy/Caddyfile`, admin API on `127.0.0.1:2019`) proxies `inbxr.cloud` to `localhost:3010` with `flush_interval -1` on `/api/stream*`.
- **Deploying updates**: Push to `origin/main`, then on the VPS run `cd /opt/inbxr && git pull && docker compose up -d --build`.
