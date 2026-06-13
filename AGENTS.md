# Repository Guidelines

## Project Structure & Module Organization
- `server/src/app.module.ts` wires configuration, shared providers, and feature modules.
- `server/src/modules/*` hosts domain logic (auth, users, panels, uploads) and should export focused Nest modules with explicit providers.
- `server/src/modules/news` owns news categories/tags plus public list/detail endpoints and admin CRUD.
- `server/src/modules/blog` owns blog categories/tags plus public list/detail endpoints and admin CRUD.
- `server/src/modules/website-settings` owns public contact/social/about-us data plus admin updates.
- `server/src/common` and `server/src/platform` centralize guards, filters, logging, queues, storage, and telemetry helpers.
- Tests live in `server/src/tests/{unit,integration,e2e}` with fixtures under `server/src/tests/setup-test.ts`; avoid creating top-level `test/` directories.
- Root-level assets include `docker-compose.yml`, `observability/` dashboards, `rabbitmq/` seed scripts, and the Prisma schema in `server/prisma`.
- Public news pages live in `ui/src/app/news` (SSR, `revalidate = 300`) and are linked in the header nav.
- Public blog pages live in `ui/src/app/blog` (SSR, `revalidate = 300`) and are linked in the header nav.
- The login page lives at `/login`; the homepage surfaces previews (slides, KPIs, featured posts, news/blog cards).
- Post detail media now uses Swiper for the main carousel + fullscreen lightbox, including zoom and mouse wheel; update `ui/src/components/dashboard/divar-posts/post-media-carousel.tsx` when changing media UX.
- The footer always renders; hide it on `/admin` and `/dashboard` via `body[data-pathname]` CSS in `ui/src/app/globals.css` to avoid client navigation races.
- RTK Query uses a shared base slice at `ui/src/features/api/baseApi.ts` and domain endpoints under `ui/src/features/api/endpoints`; `ui/src/features/api/apiSlice.ts` re-exports the hooks.

## Build, Test, and Development Commands
- `npm run start:dev` boots Nest + Fastify with hot reload, loading `.env` from the repo root.
- `npm run telegram:bot:dev` runs the Telegram bot locally (dev hot-reload). Use `npm run telegram:bot` in prod or the compose service `telegram-bot`.
- UI checks run from `/ui`: `npm run dev`, `npm run lint`, `npm run typecheck`.
- `npm run build` compiles to `server/dist`; `npm run start:prod` serves the compiled bundle.
- `npm test`, `npm run test:e2e`, and `npm run test:cov` span unit/integration, Fastify e2e, and coverage.
- `npm run lint`, `npm run format`, and `npm run typecheck` enforce ESLint, Prettier, and TypeScript contracts before a PR.
- After schema changes run `npm run prisma:migrate -- --name <migration>` and `npm run prisma:generate`; `docker compose up` provisions local dependencies.

## Coding Style & Naming Conventions
- TypeScript follows ESLint + Prettier defaults: 2-space indentation, trailing commas, single quotes.
- Use PascalCase for classes/providers, kebab-case for file names (`user-panel.module.ts`), SCREAMING_SNAKE_CASE for environment constants.
- Keep controllers thin, rely on DTOs with `class-validator`, and reuse existing platform services for integrations.
- Run `npm run lint-staged` if a Husky pre-commit fails; it mirrors the hook configuration.
- Feed loading uses 12 skeleton cards styled the same as post cards; when changing card layout, mirror changes in the skeleton (ui/src/components/dashboard/divar-posts-feed.tsx).
- Post codes are numeric (starting at 1000), stored in DB, shown in cards/detail/print/share, and searchable via the header code search (rate-limited).
- Storage public URLs are same-origin `/storage/<bucket>/<key>` (no storage subdomain). UI normalizes legacy storage hosts to `/storage`.
- Divar category filter labels may arrive as raw keys or prefixed widget labels; keep `dashboard.filters.categoryFilters.widgetLabels` in `ui/src/messages/{locale}.json` populated with both `filter_*` and raw keys so badges stay localized.
- Map tiles: TileServer-GL service added (dev port `${MAP_TILES_PORT:-7235}`, prod `${MAP_TILES_PORT:-8235}`) expecting `maps/iran.mbtiles` or `${MAP_TILES_PATH:-/var/lib/my-ads/maps}/iran.mbtiles`.
  - Fetch prebuilt tiles: `MBTILES_URL=... ./scripts/sync-tiles.sh` (honors `MAP_TILES_PATH`). Use in CI before compose/stack deploy.
  - Build Iran locally (full labels): `OMT_POSTGRES_PORT=<free_port> MIN_ZOOM=0 MAX_ZOOM=14 ./scripts/build-iran-tiles.sh` (long-running). Restart tileserver after build.
  - Default UI uses same-origin tiles: `NEXT_PUBLIC_MAP_TILE_BASE_URL=/map` -> `/map/styles/basic-preview/style.json` and `/map/styles/basic-preview/{z}/{x}/{y}.(pbf|png)`. If switching to dedicated map domains, update env + Caddy accordingly and proxy `/map`, `/data`, `/fonts` to the tileserver.
- DB backup/restore: dev Postgres on `6201` (`postgres/postgres`); prod published `6301` -> internal `5432` (`mahan_admin/zQ5gG7k3S9nK2bFw`). Backup example: `PGPASSWORD=postgres pg_dump -Fc -h host.docker.internal -p 6201 -U postgres -d my_ads -f /tmp/dev-backup.dump`. Restore to prod: `PGPASSWORD=zQ5gG7k3S9nK2bFw pg_restore --clean --if-exists --no-owner --no-acl -h host.docker.internal -p 6301 -U mahan_admin -d mahan_file /tmp/dev-backup.dump`. Keep compose target port 5432 and published port 6301 aligned.
- Automated backups: `pgbackrest-backup` writes to MinIO bucket `db-backup` with AES-256-CBC (pass `Ghader`), bundle size `1GiB`, 30-day retention, and Telegram delivery to `BACKUP_TELEGRAM_PHONES` recipients (must `/start` the bot).
- News crawlers: Eghtesad, Khabaronline, and Asriran crawlers run every 15 minutes when cron is enabled. One-off runs: `npm run news:crawl:eghtesad`, `npm run news:crawl:khabaronline`, `npm run news:crawl:asriran`. Use the News Sources admin list to enable/disable each feed.

## Authentication & Security Patterns

- **Cloudflare Turnstile** — Login OTP flow gated by `ENABLE_TURNSTILE` (admin toggle in website settings). Backend verifies Turnstile token via `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Fetch guarded with try-catch to avoid 500 on network errors. UI disables send-code button until widget loads; supports Persian language + system dark/light theme sync.
- **OTP login flow**: `POST /auth/request-otp` (triggers delivery) → `POST /auth/verify-otp` (returns JWT). Dev code `1234`. Bale OTP button available as alternative delivery channel. OTP sender falls back to console log when no gateway configured.
- **Phone input** — Leading `0` preserved visually in UI, stripped on form submit to match E.164 storage format.
- **Bale bot linking** — `BaleUserLink` stores `botId` extracted from `BALE_BOT_TOKEN` (`<numeric_id>:<secret>`). All lookups (`findChatLink()`, `findBaleLinkByPhone()`) filter by current bot's ID so restored DBs across environments never produce stale links.

## Pagination Strategy (Divar dashboard)

- **No Prisma cursor/skip** for large tables — Prisma's `cursor` + `take` causes full-table scans when the cursor column has many ties (same `publishedAt`). Instead use manual `WHERE (publishedAt, createdAt, id) < (cursor...)` tuple comparisons with a `runQuery`/`buildWhereClause` helper pattern.
- **Multi-city queries** split into per-city `UNION ALL` to hit composite indexes instead of one large table scan.
- **Required indexes** (not in Prisma schema, run after restore):
  - `DivarPost_provinceId_cityId_publishedAt_idx`
  - `DivarPost_cityId_publishedAt_idx`
  - `DivarPost_provinceId_publishedAt_idx`
  - `PostToReadQueue_status_requestedAt_idx`

## Testing Guidelines
- Jest powers every suite; use `*.spec.ts` for unit/integration and `*.e2e-spec.ts` for HTTP flows.
- Initialize Fastify via `src/tests/setup-test.ts` to share mock providers and config overrides.
- Store helpers under `src/tests` (never `dist`), load secrets with `dotenv`, and avoid external network calls in specs.
- Keep coverage at or above thresholds in `jest.config.js`; run `npm run test:cov` before shipping major features.

## Commit & Pull Request Guidelines
- Follow the current history: lowercase type prefix (`add`, `fix`, `chore`) plus an imperative summary (`fix: queue retry leak`).
- Squash WIP commits locally; automated release tooling expects tidy histories.
- PRs must explain scope, solution, and verification (tests, screenshots, curl output) and link the relevant issue. Call out env or migration steps explicitly.
- When editing infrastructure or observability assets, note required rollout timing so ops can coordinate.

## Migration Context — Production Move to WSL

### Goal
Migrate production deployment from the current Linux machine to a WSL2 (Ubuntu 24.04) machine on the same LAN, using a self-hosted GitHub Actions runner.

### Constraints
- No public IP; all external access via Cloudflare Tunnel (cloudflared)
- No push/pull to ghcr.io (images too large) — build locally on runner
- Dev services run alongside production on same machine
- Docker Swarm for production orchestration
- **Docker Desktop on WSL2 does NOT route published container ports to the WSL VM** — any CI step connecting to `localhost:6301` (or any published port) will fail. Must use `docker run --network "${STACK_NAME}_app_net"` to reach containers by service name.
- **Postgres bind mounts fail on Docker Desktop WSL** — relative paths resolve to nonexistent `/run/desktop/mnt/host/wsl/docker-desktop-bind-mounts/...` paths. Use named volumes or remove bind mounts.
- New WSL machine: `DESKTOP-766QUFO` (`armita` user), at `192.168.31.170:2222` (Windows host forwards port 2222 → WSL 22)

### Key CI Changes
- Images built locally on self-hosted runner: `docker build -t my-ads-api:latest`, etc. No registry push.
- Deploy step uses `--resolve-image never` and loads images built in prior build jobs.
- Migration step: `docker run --network "${STACK_NAME}_app_net" node:22-alpine sh -c "npx prisma migrate deploy"`
- CLOUDFLARE_API_TOKEN stored as GitHub secret (not in .env.prod) due to GitHub push protection.
- Postgres service: removed custom entrypoint, bind mount, `archive_mode`/`archive_command` (pgbackrest unavailable on WSL).

### Data Migration (completed manually after CI)
1. Dumped production DB from old machine Postgres volume (811MB, pg_dump -Fc)
2. Copied dump to WSL via SCP; dropped/recreated `public` schema on WSL Postgres before restore
3. Restored with `pg_restore --no-owner --no-acl -j 4` (2 FK constraints failed due to parallel deadlock — recreated manually)
4. Tarred production MinIO data (1.4GB) from old machine volume; extracted into WSL MinIO volume

### WSL Machine Access
- SSH: `ssh armita@192.168.31.170 -p 2222`
- Sudo password: `Ghader1+***`
- GitHub runner: `/home/armita/actions-runner/` (systemd service, auto-starts on boot)

### Postgres Settings (in docker-compose-prod.yml)
Postgres global settings are set via `-c` flags in the `command` array of the postgres service:
- `shared_preload_libraries=pg_stat_statements` + `pg_stat_statements.*` config
- `track_io_timing=on`
- `maintenance_work_mem=512MB`
- `autovacuum_vacuum_cost_limit=2000`, `vacuum_cost_limit=2000`
- `autovacuum_vacuum_scale_factor=0.05`, `autovacuum_vacuum_threshold=1000`

### Post-Restore SQL (run after DB restore when volume is recreated)
These cannot be persisted via compose — run manually after restoring a production backup:

```sql
-- Per-table autovacuum for large tables
ALTER TABLE "DivarPostAttribute" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "DivarPostMedia" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "DivarPost" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "PostToReadQueue" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);

-- Index for fetch service query (not in Prisma schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostToReadQueue_status_requestedAt_idx" ON "PostToReadQueue" (status, "requestedAt");

-- Composite indexes for dashboard post listing (prevents full-table scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_cityId_publishedAt_idx" ON "DivarPost" ("provinceId", "cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_cityId_publishedAt_idx" ON "DivarPost" ("cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);

-- pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Relevant Files
- `.github/workflows/ci.yml` — CI/CD pipeline with migration via `docker run --network`
- `docker-compose-prod.yml` — postgres settings via `-c` flags, entrypoint + bind mount removed (WSL compat)
- `Caddyfile.prod` — ports hardcoded (6304, 6300, 6306)
- `.env.prod` — CLOUDFLARE_API_TOKEN removed (stored as GitHub secret)
- `cloudflare/production/tunnel.json` — Cloudflare tunnel credentials
