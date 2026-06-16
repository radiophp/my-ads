# My Ads Platform — Backend Overview

The **My Ads** project is a NestJS + Fastify backend that powers a classified adverts platform. It ships with production-ready modules for authentication, user management, uploads, public APIs, metrics, observability, queues, storage, and websocket delivery. This document explains how the system fits together, how to run it locally or in containers, and what configuration is required.

---

## Architecture at a Glance

| Layer | Purpose |
| --- | --- |
| `src/app.module.ts` | Root wiring of configuration, platform services, and domain modules. |
| `src/common/*` | Cross-cutting concerns: decorators, guards (rate limiting/public routes), filters, pipes, utilities. |
| `src/modules/*` | Business modules (auth, users, uploads, admin panel, user panel, public endpoints). |
| `src/platform/*` | Integrations and infrastructure: cache/Redis, Prisma database, queues (RabbitMQ), metrics (Prometheus), logging (Pino), storage (MinIO/S3), observability (OpenTelemetry), websocket adapter, HTTP utility modules. |
| `src/tests/*` | Unit, integration, and e2e suites using Jest + Fastify test harness. |

### Core Domain Modules

- **Auth Module (`modules/auth`)** — JWT access + refresh token flow, guards, strategies, login/register endpoints, device management (session tracking, challenger detection, WebSocket push on new device login).
- **Users Module (`modules/users`)** — CRUD services for user entities via Prisma.
- **Public Module (`modules/public`)** — Health, info, and other publicly accessible routes. Rate limited by default.
- **Uploads Module (`modules/uploads`)** — File upload orchestration layered over MinIO/S3 storage.
- **User Panel & Admin Panel (`modules/user-panel`, `modules/admin-panel`)** — Domain-specific APIs protected by role guards.
- **Telegram Module (`modules/telegram`)** — Bot entrypoint to collect user phone via contact share and deliver posts (albums) to users.
- **Bale Module (`modules/bale`)** — Bale messenger bot integration for OTP delivery and post notifications. Outbound sends work from the `api` container; polling runs in the `bale-bot` service. All `BaleUserLink` records scoped by `botId` for cross-environment safety.
- **News Module (`modules/news`)** — News categories/tags plus public list/detail endpoints and admin CRUD for publishing updates.
- **Blog Module (`modules/blog`)** — Blog categories/tags plus public list/detail endpoints and admin CRUD for long-form articles.
- **Slides Module (`modules/slides`)** — Hero slides for the homepage with admin CRUD and ordering.
- **Featured Posts Module (`modules/featured-posts`)** — Admin-curated posts for the homepage carousel (cached in Redis for 2 hours).
- **SEO Settings Module (`modules/seo-settings`)** — Page-level metadata with admin updates (home, news list, blog list, about, dashboard, preview).
- **Website Settings Module (`modules/website-settings`)** — Public-facing contact info, social links, and about-us content managed via admin.
- **Post Codes & Search** — Every post has a numeric code (starts at 1000). Codes appear on cards, detail, print, share messages, and Telegram captions. Use the header code search to jump to a post (rate limited).

### Platform Services

- **Cache / Redis (`platform/cache`)** — Primary Redis client, scoped clients for Socket.IO, cache-manager adapter, resilience & logging.
- **Database (`platform/database`)** — Prisma service + module for PostgreSQL connectivity.
- **Queue (`platform/queue`)** — RabbitMQ integration via `amqp-connection-manager`, dead-letter handling, retry utilities, email/notification processors.
- **Storage (`platform/storage`)** — S3-compatible MinIO client for object uploads.
- **Metrics (`platform/metrics`)** — Prometheus instrumentation, HTTP latency histogram, custom gauges for health checks.
- **Logging (`platform/logging`)** — Pino structured logging with NestJS integration.
- **Observability (`platform/observability`)** — OpenTelemetry SDK bootstrap for tracing (optional, toggled via env).
- **Websocket (`platform/websocket`)** — Socket.IO adapter backed by Redis for horizontal scaling.
- **HTTP Utilities (`platform/http`)** — Favicon controller, future space for HTTP-level helpers.

---

## Running the Backend

### Prerequisites

- Node.js **18.x** or newer
- npm **9.x** or newer
- Local services (if not using Docker): PostgreSQL, Redis, RabbitMQ, MinIO/S3
- `docker` and `docker compose` (optional, for container workflow)

### 1. Clone & Install

```bash
git clone <repo-url>
cd my-ads/server
npm install
npm run prepare          # sets up Husky hooks
npm run prisma:generate
```

### 2. Configure Environment

Create `.env` in the repository root (same folder as `docker-compose.yml`). A starter template is provided as `.env.example`—copy and adjust it for your environment:

```bash
cp .env.example .env
```

The server loads `.env`, `.env.local`, and environment-specific variants automatically, including parent-directory files when running inside `/server`. This single `.env` file is shared by both `server/` and `ui/`, so keep every setting in the repo root instead of creating per-package env files.

### 3. Database Migrations

```bash
cd server
npm run prisma:migrate -- --name init
```

### 4. Local Development

```bash
npm run start:dev
# In a separate shell (Telegram bot polling/dev with auto-reload)
npm run telegram:bot:dev
```

The API listens on `http://localhost:6200` (public routes under `/public`, authenticated API under `/api` by default). Fastify reloads on file changes.

### 4.1 UI Development

```bash
cd ui
npm install
npm run dev           # Next.js frontend with hot reload
npm run lint
npm run typecheck
```

The frontend pulls its env from the repo root `.env` (e.g., `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL`). Run UI lint/typecheck inside `ui/`.
- Feed loading state shows 12 skeleton cards matching the post-card layout. If you change card styling, mirror updates in `ui/src/components/dashboard/divar-posts-feed.tsx` so skeletons stay in sync.
- Public news pages are server-rendered at `/news` and `/news/[slug]` with a 5-minute revalidation window (`revalidate = 300`), and the header nav links to `/news`.
- Public blog pages are server-rendered at `/blog` and `/blog/[slug]` with a 5-minute revalidation window (`revalidate = 300`), and the header nav links to `/blog`.
- The login flow is hosted at `/login`; the homepage now focuses on previews (hero slides, KPIs, featured posts, and latest news/blog cards).
- The homepage renders hero slides and featured posts from admin-managed sources (`/admin/slides`, `/admin/featured-posts`).
- SEO settings are managed under `/admin/seo` and applied to public pages, including `/preview`.
- The preview page lives at `/preview`, revalidates every 60 seconds, and accepts `city` / `district` query params (e.g., `/preview?city=karaj&district=azimiyeh`).
- Storage URLs should be same-origin: set `MINIO_PUBLIC_ENDPOINT` to the app host (e.g., `dev.mahanfile.com` / `mahanfile.com`) and `MINIO_PUBLIC_PATH=/storage`. Public objects then resolve as `https://<app>/storage/<bucket>/<key>` (no storage subdomain).
- Post detail media uses Swiper for the main carousel + fullscreen lightbox with zoom and mouse wheel support (`ui/src/components/dashboard/divar-posts/post-media-carousel.tsx`).
- The footer is always rendered; hide it on `/admin` and `/dashboard` via `body[data-pathname]` CSS in `ui/src/app/globals.css` to avoid missing footer on client navigation.

### 5. Test Suite

```bash
npm test -- --runInBand        # unit + integration + e2e
npm run test:e2e               # fastify e2e suite only
npm run typecheck              # TS compiler in no-emit mode
npm run lint                   # ESLint (set ESLINT_USE_FLAT_CONFIG=false)
```

### Authentication Flow

Phone-based OTP replaces the traditional email/password flow:

- `POST /auth/request-otp` &mdash; submit a phone number to trigger an OTP delivery. New phone numbers are persisted automatically.
- `POST /auth/verify-otp` &mdash; submit the phone number and the received code to obtain access/refresh tokens (during development, the code `1234` always succeeds).

OTP defaults are controlled via `OTP_TTL_SECONDS`, `OTP_DIGITS`, and the optional `OTP_SENDER_BASE_URL`/`OTP_SENDER_API_KEY` environment variables. When no gateway URL is configured, OTPs are logged to the server console for local development.

**Cloudflare Turnstile** — When `ENABLE_TURNSTILE` is enabled (admin website settings toggle), the `request-otp` endpoint validates a Turnstile token submitted by the client. The backend calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`; network failures are caught gracefully (returns `false`, no 500). The UI disables the send-code button until the Turnstile widget loads and supports Persian language + system dark/light theme sync.

**Bale OTP delivery** — The login page offers a **Bale messenger** button as an alternative OTP delivery channel. OTPs are sent directly from the `api` container via `baleBotService.sendOtpToUser()` (uses Bale bot API, not the polling service). The sender falls back to `console.log` when `BALE_BOT_TOKEN` is not configured. All `BaleUserLink` records store `botId` (numeric token prefix) so restored DBs across environments never use stale links from a different bot.

**Phone input** — The login form preserves the leading `0` visually but strips it on form submit to match E.164 phone storage format.

Sessions in the UI auto-hydrate from `localStorage` before any RTK Query hooks fire (we moved the hydration hook to `useLayoutEffect`) and refresh tokens are reused transparently: every 401 triggers a single-flight refresh call, updates Redux/local storage, and retries the original request. If refresh fails, the app clears auth state and routes back to `/`.

### 6. Docker Compose Stack

From the repository root:

```bash
docker compose up --build
```

Services exposed:

| Service | Port | Notes |
| --- | --- | --- |
| API (NestJS) | 6200 | hot-reloads via `npm run start:dev` inside the container; Swagger UI at `/docs` |
| PostgreSQL | 6201 | default credentials `postgres/postgres` |
| Redis Stack | 6202 | TLS disabled by default; Insight UI on 6203 |
| RabbitMQ | 6213 | connection URL `amqp://rabbitmq:6213` |
| MinIO | 6204 | console available if enabled in compose |
| Prometheus | 9090 | uses configuration in `observability/` |
| Telegram Bot | n/a | separate `telegram-bot` service runs `npm run telegram:bot` |
| Telegram Bot | (runs alongside API; no exposed port) | separate `telegram-bot` service runs `npm run telegram:bot` |
| Grafana | 3000 | provisions dashboards from `observability/grafana/...` |
| Tileserver | 6235 | serves Iran MBTiles (map) at `/map` (dev). Prod uses **7235**. |

Stop with `docker compose down`.

### Map tiles (Iran MBTiles)

The map uses `maptiler/tileserver-gl` with an Iran MBTiles file and is proxied at `/map`.

1) Place the MBTiles file:
   - Dev/local: `./maps/iran.mbtiles`
   - Prod/swarm: set `MAP_TILES_PATH` to a host directory that contains `iran.mbtiles`

2) Make sure these env vars are defined:
   - `MAP_TILES_PATH` (host directory with `iran.mbtiles`)
   - `MAP_TILES_PORT` (published port for tileserver, e.g. `7235`)

3) Bring up tileserver:
   - Local: `docker compose --profile full up -d tileserver`
   - Prod: redeploy the stack so the service binds the new `MAP_TILES_PATH`

Tileserver expects `/data/iran.mbtiles` inside the container. If you see `ENOENT: /data/iran.mbtiles` in logs, the host path is empty or not mounted.

### 7. Production Build

```bash
cd server
npm run build
npm run start:prod   # serves compiled dist/main.js
```

Ensure the same environment variables are available in production.

### Database backup & restore

PostgreSQL is exposed on host-mode ports (dev `6201`, prod published `6301` targeting internal `5432`). Examples:

- **Dev backup** (from host):  
  `PGPASSWORD=postgres pg_dump -Fc -h host.docker.internal -p 6201 -U postgres -d my_ads -f /tmp/dev-backup.dump`

- **Prod restore** (from host):  
  `PGPASSWORD=zQ5gG7k3S9nK2bFw pg_restore --clean --if-exists --no-owner --no-acl -h host.docker.internal -p 6301 -U mahan_admin -d mahan_file /tmp/dev-backup.dump`

Adjust usernames/passwords/ports per your env. Keep `TargetPort=5432` and `PublishedPort=6301` aligned in `docker-compose-prod.yml`.

After a restore, run these SQL commands to re-apply per-table settings, indexes, and extensions that aren't persisted in the compose file:

```sql
-- Mark completed queue rows as freshly fetched to avoid mass reactivation
UPDATE "PostToReadQueue"
SET "lastFetchedAt" = now(), "updatedAt" = now()
WHERE status = 'COMPLETED';

-- Per-table autovacuum for large tables (prevents vacuum storms)
ALTER TABLE "DivarPostAttribute" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "DivarPostMedia" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "DivarPost" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);
ALTER TABLE "PostToReadQueue" SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 5000, autovacuum_vacuum_cost_limit = 2000);

-- Index for fetch service query (prevents sequential scans on 600K+ rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostToReadQueue_status_requestedAt_idx" ON "PostToReadQueue" (status, "requestedAt");

-- Composite indexes for dashboard post listing (prevents full-table scans on scroll/pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_cityId_publishedAt_idx" ON "DivarPost" ("provinceId", "cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_cityId_publishedAt_idx" ON "DivarPost" ("cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);

-- pg_stat_statements extension (for query performance monitoring)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Automated pgBackRest backups (production)

Production runs a `pgbackrest-backup` service on a daily schedule (defaults to `02:00` Asia/Tehran). It creates/ensures a private MinIO bucket named `db-backup`, stores encrypted, bundled backups, and delivers the bundle parts via Telegram.

- Schedule + timezone: `BACKUP_CRON` (`0 2 * * *`) and `BACKUP_TZ` (`Asia/Tehran`).
- Repo details: bucket `db-backup`, prefix `/pgbackrest`, bundle size `1GiB`, zstd compression level `9`.
- Encryption: AES-256-CBC with fixed passphrase `Ghader`.
- Retention: 30 days for full + archive (configured via pgBackRest retention).
- Telegram delivery: `BACKUP_TELEGRAM_PHONES` (defaults to `+989038923989,+989195043739`). Each recipient must start the bot so a `TelegramUserLink` exists.
- S3 endpoint: pgBackRest expects an HTTPS S3 endpoint; set `PGBACKREST_REPO1_S3_ENDPOINT` (for example `storage.mahanfile.com:443`).

You can override the stanza name via `PGBACKREST_STANZA`, S3 endpoint via `PGBACKREST_REPO1_S3_ENDPOINT`, and TLS verification via `PGBACKREST_REPO1_S3_VERIFY_TLS`.

### Monitoring (Grafana / Prometheus / Loki / Tempo)
- Grafana: `monitoring.mahanfile.com` (or `localhost:6323` with `GRAFANA_PORT` default). Admin credentials come from `GF_SECURITY_ADMIN_USER` / `GF_SECURITY_ADMIN_PASSWORD` secrets.
- Data sources:
  - Prometheus `http://prometheus:6322`
  - Loki `http://loki:6319`
  - Tempo `http://tempo:6320`
- Dashboards are pre-provisioned (API observability, Logs overview). If panels show “no data”:
  - Check Prometheus targets: `api:6300` and `tempo:6320` should be **up**.
  - Ensure promtail is running and pushing to `loki:6319` (see `observability/promtail-config.yaml`).
  - Set Grafana time range to “Last 30m” and refresh.
  - Loki drops logs older than 24h to avoid ingest errors; recent logs should appear quickly.

---

## Background Jobs & Divar Pipelines

### Scheduler entrypoint

Scheduled workloads (Divar harvest/fetch/analyze plus media mirroring) do **not** run automatically when you call `npm run start:dev`. Instead, boot the scheduler explicitly:

```bash
cd server
npm run cron:scheduler
```

The script sets `ENABLE_CRON_JOBS=true` and executes `src/scripts/run-cron-scheduler.ts`, which wires Nest’s `ScheduleModule`. Every cron-backed service double-checks the env flag **and** keeps its own `isRunning`/`Promise` guard so a new tick returns immediately if the previous run is still busy. When authoring a new job, follow the same pattern: gate on `ENABLE_CRON_JOBS`, set the guard at the top, and release it in a `finally` block.

Need a one-off run for debugging? Use the single-shot scripts, each of which loads the shared `.env`:

- `npm run divar:harvest-posts`
- `npm run divar:fetch-posts`
- `npm run divar:analyze-posts`
- `npm run divar:sync-media`
- `npm run news:crawl:eghtesad`
- `npm run news:crawl:khabaronline`
- `npm run news:crawl:asriran`

News crawlers are controlled by the **News Sources** admin list; deactivate a source to pause its crawl without code changes. Each crawler runs on a 15-minute schedule when cron is enabled.

### Phone number fetch worker (Divar)

Phone numbers are fetched asynchronously via a **lease/report** worker loop to support running multiple workers without duplicate work.

- **Backend API:**
  - `POST /api/phone-fetch/lease` → returns the next eligible post (newest → oldest) plus its `externalId` (Divar token) and `contactUuid`.
  - `POST /api/phone-fetch/report` → worker submits the result (`ok` with `phoneNumber`, or `error` with reason). Business title/phone cache updates are handled server-side when present.
- **Worker script:** `scripts/phone-fetch-worker.js`
- **Run command:** from `server/`

```bash
cd server
npm run phone-fetch:worker
```

#### Configuration

The worker loads configuration in this order:

1. `scripts/fetch_divar_phones_worker.env` (recommended place for worker-only config)
2. repository root `.env` (shared app config)

Example `scripts/fetch_divar_phones_worker.env`:

```bash
BASE_URL=https://dev.mahanfile.com/api
FETCH_METHOD=playwright   # playwright (default) or curl
SLEEP=10                  # seconds between leases (rate-limit safety)
HEADERS_FILE=jwt.txt      # only required for curl mode
```

#### Modes

- **Playwright mode (default)**: opens a real Firefox UI and navigates to `https://divar.ir/v/<token>`, clicks **اطلاعات تماس**, and extracts the phone number.
  - Login is **manual** (you log in once); the worker persists browser state under `scripts/.pw-firefox-profile` and reuses it across restarts.
  - If the script detects you are not logged in, it opens “دیوار من” → “ورود” and waits until “خروج” appears.
- **Curl mode**: calls Divar’s API directly (`/v8/postcontact/web/contact_info_v2/<token>`) using headers copied from a real browser session.
  - Put your headers in `scripts/jwt.txt` exactly as captured (one header per line).
  - Do **not** include `Content-Length` or `Connection` (the worker ignores them if present).

#### Notes & troubleshooting

- The worker is intentionally slow (`SLEEP` plus small internal delays) to reduce rate limiting and account bans.
- To run multiple workers, start the command multiple times with different `WORKER_ID` values:

```bash
WORKER_ID=worker-1 npm run phone-fetch:worker
WORKER_ID=worker-2 npm run phone-fetch:worker
```

- If Firefox opens/closes immediately, verify you have a working desktop session (X/Wayland) and that `PW_BROWSER=firefox` is set in `scripts/fetch_divar_phones_worker.env`.
- If you want to reuse an existing Firefox profile, set `FIREFOX_USER_DIR` in `scripts/fetch_divar_phones_worker.env` (otherwise `scripts/.pw-firefox-profile` is used).

### Harvest / fetch / analyze flow

- **Reactivation policy:** When the harvester spots a duplicated token it compares the stored `DivarPost.publishedAt` with the fresh payload. If the delta exceeds one hour, the token is reactivated for refetch. Logs now include the prior timestamp, the number of minutes stale, the threshold, and any skip reason (e.g., “already processing”). Reactivation also resets `fetchAttempts` so the fetch worker retries immediately.
- **Tehran-aware page limits:** `DIVAR_HARVEST_MAX_PAGES` caps how deep each category/location is crawled during daytime. Between `DIVAR_HARVEST_NIGHT_START_HOUR` and `DIVAR_HARVEST_NIGHT_END_HOUR` (evaluated in the `Asia/Tehran` timezone) the system switches to `DIVAR_HARVEST_MAX_PAGES_NIGHT`. Setting either limit to `-1` disables the cap and the harvester keeps paging until Divar has no more data.
- **Concurrency coordination:** While `divar:fetch-posts` is working on a token it marks the queue row so harvest skips reactivation for that record until the fetch job finishes or times out. That prevents thrash whenever Divar reshuffles publish times.
- **Stuck job recovery:** The fetcher releases any queue rows stuck in `PROCESSING` for more than 1 minute back to `PENDING` before each batch (hardcoded safeguard for crashes/restarts).
- **Pagination (dashboard):** The dashboard post listing avoids Prisma cursor/skip — full-table scans occur when the cursor column has tied values. Instead, the service uses manual `WHERE (publishedAt, createdAt, id) < (cursor...)` tuple comparisons with a `runQuery`/`buildWhereClause` helper. Multi-city queries split into per-city `UNION ALL` to leverage composite indexes. Required indexes (run manually after DB restore): `DivarPost_provinceId_cityId_publishedAt_idx`, `DivarPost_cityId_publishedAt_idx`, `DivarPost_provinceId_publishedAt_idx`.

### Media mirroring

`DivarPostMedia` now stores `localUrl`/`localThumbnailUrl`. The `divar:sync-media` cron consumes CDN-backed rows in batches of 25, downloads both the primary and thumbnail assets (capped at two downloads per second with five retries and graceful 404 handling), and uploads them to MinIO using the same path layout (`https://<our-domain>/<bucket>/static/photo/...`). API responses automatically prefer local URLs when present and fall back to the original Divar CDN links otherwise. Control the cadence via `DIVAR_MEDIA_SYNC_CRON`.

---

## Frontend (Next.js UI)

The customer-facing UI lives in `ui/` and is built with **Next.js 16**, **React 19**, and `next-intl` for localisation.

### Localization notes

- UI messages live in `ui/src/messages/{locale}.json`.
- Divar category filter widgets can return raw keys (for example `size`, `price_per_square`, `has-video`) or prefixed keys (for example `dashboard.filters.categoryFilters.widgetLabels.size`).
- Keep `dashboard.filters.categoryFilters.widgetLabels` populated with both `filter_*` and raw keys so filter badges and chips stay localized; missing keys will render as the raw key string.

### Prerequisites

- Node.js **22.x** (matches the CI environment)
- npm **10.x**
- Playwright system dependencies (only required for e2e tests)

### 1. Install & Dev Server

```bash
cd ui
npm install            # install dependencies
npm run dev            # start Next.js on http://localhost:6005
```

The helper script `scripts/run-next.mjs` standardises the dev port (`NEXT_UI_PORT=6005`) and disables Turbopack for now. Environment variables are loaded from the repository root so the UI can share `.env` files with the backend.

RTK Query is split into a shared base slice at `ui/src/features/api/baseApi.ts` and per-domain endpoint modules under `ui/src/features/api/endpoints/`. Keep imports pointing at `ui/src/features/api/apiSlice.ts`, which re-exports the base slice and all hooks.

### 2. Linting & Typechecking

```bash
npm run lint           # ESLint (internally sets ESLINT_USE_FLAT_CONFIG=false)
npm run typecheck      # TypeScript --noEmit
```

Tailwind class ordering rules are enabled; ESLint may rewrite class strings during `--fix`.

### 3. Git Hooks (Husky)

Pre-commit hooks run lint-staged, typecheck, and tests for both `server/` and `ui/`:

```bash
git config core.hooksPath .husky
```

Run this once per clone to enable hooks. The config is local to the repo and tells git to use `.husky/` instead of `.git/hooks/`.

### 3. Tests

```bash
npm run test -- --run  # Vitest (uses --passWithNoTests so empty suites are allowed)
npm run test:e2e       # Playwright end-to-end suite
```

Vitest currently runs without spec files; once tests are added they will execute automatically in CI. Playwright requires browsers to be installed locally via `npx playwright install --with-deps`.

### 4. Build

```bash
npm run build          # Produces the production .next/ artefacts
```

### Dashboard & data quality upgrades

- **Category-aware filter rail** – The dashboard now exposes the Divar category tree (filtered to `allowPosting=true` nodes). Breadcrumbs let users step up the hierarchy, and the chip row shows either child categories or siblings for leaf nodes. Redux keeps a `categorySelection` object (`slug` + `depth`) so the frontend knows whether the slug maps to `cat1`, `cat2`, `cat3`, or the canonical slug column.
- **Hierarchical location filters** – Province, city, and district selectors share the same Redux slice. Selecting a province resets downstream filters, cities support multi-select, and the district picker activates as soon as at least one city is selected (multi-city mode prefixes each district with its city name). The resulting `districtIds` are sent to `/divar-posts` so backend queries can be narrowed to specific neighborhoods.
- **API filtering** – `/divar-posts` accepts `categorySlug`/`categoryDepth` plus optional `districtIds`. Depth determines which Prisma fields are queried (e.g., depth 0 → `cat1`, depth 1 → `cat2`, depth 2 → `cat3`/`categorySlug`), while `districtIds` map to the `districtId` column. The service logs every query (`where`, cursor, limit) to help debug empty feeds.
- **Category filter DSL** – Each Divar category has a JSON payload describing its widgets (price ranges, room chips, toggles, etc.). See `docs/category-filters.md` for a deep dive into the schema and how to render/serialize those filters in the dashboard.
- **Visual polish** – Post cards switched to a responsive 1/3/4-column grid with edge-to-edge media, iconised overlay badges (business type, publish time, image count), and zero-value price/rent fields are suppressed automatically.

### PWA & mobile UX

- **Service worker** – The UI ships a minimal `ui/public/service-worker.js` so `/service-worker.js` always exists in production. It imports `/push-sw.js` for push + click handling.
- **Install flow** – An inline script in `ui/src/app/layout.tsx` captures `beforeinstallprompt` into `window.__pwaPromptEvent` and emits `pwa:installable`; `usePwaPrompt` and the install dialog reuse it to avoid missing the prompt.
- **Standalone splash** – A one-time, session-scoped splash runs for 5s in standalone mode. `globals.css` hides `#app-shell` while `data-pwa-splash` is present and renders the centered `/logo-mahan-file.png` image.
- **Deep-link back handling** – `PwaBackNavigation` traps the first back action on a deep link in standalone mode and redirects to `/` instead of closing the app.
- **Mobile navigation** – Small screens use a fixed bottom nav (Home/Dashboard/Notifications/Other) and hide the top header; the “Other” item opens the full mobile menu.
- **Manifest + URLs** – PWA metadata lives in `ui/src/app/manifest.ts` with icons under `/public/fav`. Set `NEXT_PUBLIC_APP_URL` + `NEXT_PUBLIC_API_BASE_URL` in CI/builds so install metadata and notification links resolve to the right domain.

## Map Tile Service

The platform runs a self-hosted **TileServer-GL v4.8.0** serving Iran vector tiles with Persian street labels from an OSM Bright style — all **offline** (no internet dependency).

### Architecture

```
                     ┌─────────────────────┐
                     │   Caddy (mahanfile)  │
                     │  /map/* → tileserver │
                     │  /map-assets/* → UI  │
                     └──────┬──────────────┘
                            │
              ┌─────────────┴──────────────┐
              │       TileServer-GL         │
              │  v4.8.0  (port 8080/7235)   │
              │  mounts: config.json, fonts │
              │  serves: Iran vector tiles  │
              └─────────────┬──────────────┘
                            │
              ┌─────────────┴──────────────┐
              │      iran.mbtiles          │
              │  905 MB, maxzoom 14        │
              │  bounds: 44-63E, 24-39N    │
              └────────────────────────────┘
```

### Key files

| File | Purpose |
| --- | --- |
| `maps/iran.mbtiles` | Pre-built Iran vector tileset (not in git, see `.gitignore`) |
| `maps/config.json` | Tileserver config: `serveAllFonts: true`, mbtiles source declaration |
| `maps/fonts/` | Noto Naskh Arabic Regular/Bold PBF font stacks (515 files, 7.3 MB, committed) |
| `ui/public/map-assets/style.json` | Self-hosted OSM Bright style with Persian-only labels |
| `ui/public/map-assets/sprite*.{json,png}` | OSM Bright sprite sheets (4 files) |
| `ui/public/map-assets/maplibre-rtl-text.js` | RTL text plugin for Persian/Arabic shaping (426 KB) |
| `ui/src/components/dashboard/divar-posts/post-location-map.tsx` | MapLibre component: RTL loader, font scaling, tile source rewrite |

### Caddy routing

- Production: `handle_path /map/*` → `tileserver:8080`
- `/map-assets/*` falls through to Next.js static serving
- **Trailing slash is crucial** — `/map*` would also catch `/map-assets/*` and forward it to tileserver (404)

### Font generation

To regenerate PBF fonts from TTF:
```bash
node /tmp/gen-pbf-fonts.js
```
Key details:
- Uses `@elastic/fontnik.glyphToSDF()` + `opentype.js` + `protobufjs`
- Buffer fix: stored dimensions must subtract `2*buffer` from fontnik output to match MapLibre's internal 3px border
- Font stacks go in `maps/fonts/{Font Name}/{start-end}.pbf`

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MAP_TILE_BASE_URL` | `/map` | Same-origin tile proxy path |
| `NEXT_PUBLIC_MAP_STYLE_CDN_URL` | *(empty)* | Set to use MapTiler CDN style instead of local |
| `MAP_TILES_PORT` | `7235` (dev) / `8235` (prod) | Tileserver host port |

### Production deployment

After CI deploys stack:
1. **SCP data** to host: `iran.mbtiles` (905 MB), `config.json`, `fonts/` → `${MAP_TILES_PATH:-/var/lib/my-ads/maps}/`
2. **Force-update tileserver**: `docker service update --force my-ads-production_tileserver` (picks up new fonts + config)
3. **Force-update Caddy**: `docker service update --force my-ads-production_caddy` (picks up Caddyfile changes)

### Building tiles locally

```bash
# Full build (4+ hours, requires OpenMapTiles + PostGIS)
OMT_POSTGRES_PORT=55432 MIN_ZOOM=0 MAX_ZOOM=14 ./scripts/build-iran-tiles.sh

# Or fetch prebuilt
MBTILES_URL=https://example.com/iran.mbtiles ./scripts/sync-tiles.sh
```

---

## Prometheus, Observability & Metrics

- `GET /metrics` exposes Prometheus-compatible metrics (HTTP latency histogram, health gauges, queue counters, etc.).
- Health dependency metrics: `health_dependency_status{component=...}` (gauge) and `health_dependency_latency_seconds` (histogram).
- `GET /public/health` returns structured JSON including `status`, `failedComponents`, and per-dependency details with retry/backoff caching.
- OpenTelemetry can push traces to an OTLP endpoint when enabled via `OTEL_ENABLED=true`.
- Logging is handled by Pino; pretty-printing is controlled with `LOG_PRETTY`.

### Grafana & dashboards

- Grafana runs behind `https://monitoring.mahanfile.com` (Caddy reverse proxy). Admin credentials are supplied via GitHub secrets/vars (`GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `GRAFANA_ADMIN_EMAIL`); do **not** hardcode them in the repo.
- Datasources are provisioned automatically (`Prometheus`, `Loki`, `Tempo`); Prometheus scrapes the API `/metrics` and Tempo.
- Dashboards auto-provision from `observability/grafana/provisioning/dashboards/`:
  - **Service Health Overview** (`service-health`) — dependency gauges/timeline.
  - **API Observability** (`api-observability`) — RPS by status, error rate, latency p50/p90/p99, top paths, dependency health.
  - **Logs Overview** (`logs-overview`) — log volume/errors/warnings by service, recent errors, OTP failure counter, and live log stream with `compose_service` labels.
- Add new dashboards by dropping JSON files into that folder; Grafana scans the path every 60s by default.

---

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) run on every push and pull request. The pipeline has three stages:

### 1. Validation (GitHub-hosted, Node.js 22)

Jobs run on `ubuntu-latest` to lint, typecheck, test, and build the code:
- **server-lint**, **server-typecheck**, **server-test**, **server-build**
- **ui-lint**, **ui-typecheck**, **ui-test**, **ui-build**

### 2. Build images (self-hosted runner)

On `main` branch pushes, three build jobs run on the **self-hosted** runner (same machine as deployment):
- **build-api-image** — `docker build -t my-ads-api:latest -f server/Dockerfile server`
- **build-backup-image** — `docker build -t my-ads-backup:latest -f backup/Dockerfile backup`
- **build-ui-image** — `docker build -t my-ads-ui:latest -f ui/Dockerfile ui`

Images are tagged with simple names (no registry prefix) and stored only in the local Docker daemon — no push to ghcr.io.

### 3. Deploy (self-hosted runner)

The **deploy** job runs `docker stack deploy -c docker-compose-prod.yml my-ads --resolve-image never`, using the locally built images. No registry login or image pull is needed.

---

## Directory Map

```
server/
├── src/
│   ├── app.module.ts             # root Nest module
│   ├── main.ts                   # Fastify bootstrap with security, metrics, websocket adapter
│   ├── common/                   # decorators, guards, pipes, filters, utils
│   ├── modules/                  # feature modules (auth, users, public, etc.)
│   ├── platform/                 # infrastructure integrations (cache, db, queue, storage, metrics, logging, http, observability, websocket)
│   └── tests/                    # Jest unit/integration/e2e suites
├── prisma/                       # Prisma schema and migrations
├── observability/                # Prometheus + Grafana provisioning
├── docker-compose.yml            # local stack definition
├── Dockerfile                    # production Docker build
└── README.md                     # this document
```

---

## Environment Variables

All configuration is validated at startup (`platform/config/environment.validation.ts`). Defaults reflect the Docker Compose stack; adjust as needed for local services.

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment (`development`, `test`, `production`). |
| `APP_HOST` | `0.0.0.0` | Interface the Fastify server binds to. |
| `APP_PORT` | `6200` | HTTP port for the API. |
| `APP_GLOBAL_PREFIX` | `api` | Global prefix for authenticated routes (`/api`). Health/info routes exclude this by default. |
| `DATABASE_URL` | — | PostgreSQL connection string (required). Must start with `postgres://` or `postgresql://`. |
| `DATABASE_DIRECT_URL` | — | Optional direct connection string for Prisma migrations. |
| `SHADOW_DATABASE_URL` | — | Optional URL for Prisma shadow database (migrations). |
| `POSTGRES_MAX_CONNECTIONS` | `200` | Postgres `max_connections` override for the Swarm service (docker-compose-prod.yml). |
| `REDIS_HOST` | `redis` | Primary Redis hostname. |
| `REDIS_HOST_FALLBACK` | — | Overrides host when running outside containers (e.g., `host.docker.internal`). |
| `REDIS_PORT` | `6202` | Redis TCP port. |
| `REDIS_DB` | `0` | Redis logical database index. |
| `REDIS_USERNAME` | — | Optional ACL username. |
| `REDIS_PASSWORD` | — | Optional Redis password. |
| `REDIS_TLS` | `false` | Enable TLS (`true/false`). |
| `REDIS_KEY_PREFIX` | — | Optional key prefix (helps namespace shared Redis). |
| `JWT_ACCESS_TOKEN_SECRET` | — | Secret used to sign access tokens (required). |
| `JWT_REFRESH_TOKEN_SECRET` | — | Secret used to sign refresh tokens (required). |
| `JWT_ACCESS_TOKEN_TTL` | `900s` | Access token lifetime (e.g., `900s`, `15m`). |
| `JWT_REFRESH_TOKEN_TTL` | `7d` | Refresh token lifetime. |
| `CORS_ORIGIN` | — | Allowed origin(s) for CORS (string or comma-separated). |
| `RATE_LIMIT_TTL` | `60` | Default rate-limit window seconds. |
| `RATE_LIMIT_MAX` | `100` | Default max requests per rate-limit window. |
| `RABBITMQ_HOST` | `rabbitmq` | RabbitMQ hostname (used for discovery/logging). |
| `RABBITMQ_URL` | `amqp://rabbitmq:6213` | Connection URL for `amqp-connection-manager`. |
| `RABBITMQ_QUEUE_PREFIX` | `my-ads` | Prefix applied to all queues. |
| `RABBITMQ_PREFETCH` | `10` | Prefetch value per consumer. |
| `RABBITMQ_HEARTBEAT` | `60` | Heartbeat interval (seconds). |
| `RABBITMQ_RECONNECT_SECONDS` | `5` | Reconnect delay (seconds) in connection manager. |
| `RABBITMQ_MAX_CONSUMER_RETRIES` | `5` | Maximum handler requeue attempts before dead-lettering. |
| `RABBITMQ_CONSUMER_RETRY_DELAY_MS` | `500` | Base backoff delay for consumer retry helper. |
| `RABBITMQ_DLQ_SUFFIX` | `dead` | Dead-letter queue suffix (`<queue>.dead`). |
| `MINIO_ENDPOINT` | `minio` | MinIO/S3 endpoint host. |
| `MINIO_PORT` | `6204` | MinIO port. |
| `MINIO_USE_SSL` | `false` | Use HTTPS when talking to MinIO/S3. |
| `MINIO_ACCESS_KEY` | `minioadmin` | Object storage access key. |
| `MINIO_SECRET_KEY` | `minioadmin` | Object storage secret. |
| `MINIO_BUCKET` | `upload` | Default bucket created on boot. |
| `MINIO_REGION` | — | Optional bucket region. |
| `BACKUP_TZ` | `Asia/Tehran` | Timezone for pgBackRest backup scheduling. |
| `BACKUP_CRON` | `0 2 * * *` | Cron schedule for pgBackRest backups (runs in `pgbackrest-backup`). |
| `BACKUP_TELEGRAM_PHONES` | `+989038923989,+989195043739` | Comma-separated phone numbers to receive backup files via Telegram. |
| `PGBACKREST_STANZA` | `my-ads` | Stanza name used by pgBackRest. |
| `PGBACKREST_REPO1_S3_ENDPOINT` | `storage.mahanfile.com:443` | HTTPS S3 endpoint used by pgBackRest repository access. |
| `PGBACKREST_REPO1_S3_VERIFY_TLS` | `n` | Whether pgBackRest verifies TLS when talking to MinIO/S3. |
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry tracing (`true/false`). |
| `OTEL_SERVICE_NAME` | `my-ads-api` | Service name reported to OTLP exporters. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP HTTP endpoint for traces. |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | Optional OTLP headers (comma-separated `key=value`). |
| `OTEL_LOG_LEVEL` | — | Overrides OTEL diagnostic log level (`none`, `error`, `warn`, `info`, `debug`, `verbose`, `all`). |
| `LOG_LEVEL` | `info` | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`). |
| `LOG_PRETTY` | `false` | Pretty-print logs (true/false). |
| `HEALTH_RETRY_ATTEMPTS` | `3` | Number of retries per dependency health probe. |
| `HEALTH_RETRY_BASE_DELAY_MS` | `150` | Base delay (ms) for exponential backoff between retries. |
| `HEALTH_FAILURE_CACHE_MS` | `5000` | How long to cache failed dependency results to reduce pressure. |
| `OTP_TTL_SECONDS` | `300` | OTP validity duration in seconds. |
| `OTP_DIGITS` | `6` | Number of digits generated for OTP codes. |
| `OTP_SENDER_BASE_URL` | — | Optional HTTP endpoint invoked to deliver OTP codes. |
| `OTP_SENDER_API_KEY` | — | Optional bearer token used when calling the OTP provider. |
| `TURNSTILE_SECRET_KEY` | — | Cloudflare Turnstile secret key for server-side verification (`POST /auth/request-otp`). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | — | Public Turnstile site key exposed to the UI for widget rendering. |
| `BALE_BOT_TOKEN` | — | Bale messenger bot token (`<numeric_id>:<secret>`). Used for OTP delivery and user linking. |
| `BALE_BOT_AUTOSTART` | `true` | Whether the bot polling service starts automatically. Set to `false` in the `api` container (polling handled by `bale-bot` service). |
| `ENABLE_CRON_JOBS` | `false` | Set to `true` to allow scheduled jobs to execute (used by `npm run cron:scheduler`). |
| `DIVAR_HARVEST_CRON` | `0 */30 * * * *` | Cron expression controlling the Divar harvest scheduler (defaults to every 30 minutes). |
| `DIVAR_FETCH_CRON` | `*/1 * * * *` | Cron expression for the Divar post fetch scheduler (defaults to every minute). |
| `DIVAR_ANALYZE_CRON` | `*/1 * * * *` | Cron expression for the Divar post analyze scheduler (defaults to every minute). |
| `DIVAR_MEDIA_SYNC_CRON` | `0 0 * * * *` | Cron expression for mirroring Divar media into MinIO (defaults to hourly). |
| `DIVAR_HARVEST_MAX_PAGES` | `20` | Maximum number of pages to fetch per category/location during normal hours (set to `-1` for unlimited). |
| `DIVAR_HARVEST_MAX_PAGES_NIGHT` | `5` | Maximum number of pages between the configured night hours (omit to reuse the normal limit). |
| `DIVAR_HARVEST_NIGHT_START_HOUR` | `0` | Local hour (0-23) when the reduced harvest window starts. |
| `DIVAR_HARVEST_NIGHT_END_HOUR` | `5` | Local hour (0-23) when the reduced harvest window ends (exclusive). |
| `NOTIFICATION_WINDOW_MINUTES` | `10` | Sliding window (minutes) the matcher scans for unseen Divar posts when building notifications. |
| `NOTIFICATION_SCAN_BATCH_SIZE` | `50` | Number of posts processed per matcher batch before yielding to the event loop. |
| `NOTIFICATION_RETRY_INTERVAL_MS` | `30000` | Delay (ms) between websocket delivery attempts when the user is offline. |
| `NOTIFICATION_MAX_ATTEMPTS` | `3` | Maximum websocket delivery attempts before a notification is marked as failed. |
| `NOTIFICATION_RETENTION_DAYS` | `3` | Retention policy for persisted notifications (older entries are purged hourly). |
| `NOTIFICATION_PUSH_ALWAYS` | `true` | Attempt push delivery even when websocket delivery succeeds. |
| `VAPID_PUBLIC_KEY` | — | VAPID public key for web push (server). |
| `VAPID_PRIVATE_KEY` | — | VAPID private key for web push (server). |
| `VAPID_SUBJECT` | `mailto:admin@example.com` | VAPID subject (mailto or URL). |
| `PUSH_NOTIFICATION_TIMEOUT_MS` | `8000` | Timeout (ms) per web push send. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | Public VAPID key exposed to the UI for push subscriptions. |

Environment variables not listed above are either optional feature toggles or inherit defaults inside module configuration files.

---

## Production deployment (Docker Swarm)

`docker-compose-prod.yml` defines the production stack expected to run on a Docker Swarm cluster. Images are built locally by a **self-hosted GitHub Actions runner** and deployed directly — no container registry push/pull.

A typical deployment:
1. **Build images** on the self-hosted runner from CI: `docker build -t my-ads-api:latest ...` (and similarly for `my-ads-ui`, `my-ads-backup`).
2. **Export environment variables** from GitHub Actions variables/secrets.
3. **Deploy**: `docker stack deploy -c docker-compose-prod.yml my-ads --resolve-image never` on the Swarm manager node.

**No registry login or image pull is required.** The `--resolve-image never` flag ensures Docker uses the locally built images without attempting to pull from a remote registry.

### Networking
- Production uses **Cloudflare Tunnel** (`cloudflared`) to expose services externally.
- Caddy does **not** bind host ports 80/443 — cloudflared connects to `https://caddy:443` internally over the Docker overlay network.
- Caddy exposes port `2015` on the host for health/management checks only.

### Stack services
The stack runs **two API-related services**:

- `api` – the primary NestJS HTTP service that serves requests.
- `api-cron` – a lightweight replica of the same container that executes `node dist/scripts/run-cron-scheduler.js` with `ENABLE_CRON_JOBS=true`. This process is isolated from the HTTP pods so scheduled jobs keep running even when you scale the API instances or deploy rolling updates.

### GitHub Actions variables (safe to expose)

| Name | Description |
| --- | --- |
| `API_IMAGE` | API image name (e.g., `my-ads-api`). Built locally on the self-hosted runner. |
| `UI_IMAGE` | UI image name (e.g., `my-ads-ui`). Built locally on the self-hosted runner. |
| `APP_PORT` | Published Fastify/Nest port (defaults to `6200`). |
| `APP_GLOBAL_PREFIX` | API prefix (`api`). |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PORT` | Database connection metadata (non-secret). |
| `REDIS_PORT` | Redis port exposed inside the overlay network. |
| `RABBITMQ_USERNAME` | Username for the broker (paired with the secret password). |
| `MINIO_PORT` / `MINIO_CONSOLE_PORT` | MinIO API + console ports. |
| `MINIO_BUCKET` / `MINIO_REGION` | Default bucket + region. |
| `CORS_ORIGIN` | Allowed origin(s) for the API (e.g., dashboard URL). |
| `NEXT_UI_PORT` | Published Next.js port (defaults to `6005`). |
| `NEXT_PUBLIC_APP_URL` | Public URL that the UI should advertise (e.g., `https://mahan.toncloud.observer`). |
| `NEXT_PUBLIC_API_BASE_URL` | Public API base URL (usually `${NEXT_PUBLIC_APP_URL}/api`). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key for the UI to register push subscriptions. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Turnstile site key for the login page widget. |
| `API_REPLICAS` / `UI_REPLICAS` / `API_CRON_REPLICAS` | Desired replica counts for each service (Swarm will scale them). |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` | Optional overrides for the API rate limiter. |
| `OTP_TTL_SECONDS` / `OTP_DIGITS` / `OTP_SENDER_BASE_URL` | OTP delivery configuration (non-secret pieces). |
| `OTEL_ENABLED` / `OTEL_EXPORTER_OTLP_ENDPOINT` / `LOG_LEVEL` / `LOG_PRETTY` / `PRISMA_LOG_QUERIES` | Observability/logging toggles. |
| `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` | Public analytics write key (if you have a client-side analytics vendor). |

### GitHub Actions secrets (never expose)

| Name | Description |
| --- | --- |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password used by the stack and Prisma migrations. |
| `DATABASE_URL` / `DATABASE_DIRECT_URL` | Optional explicit URLs (only needed if you override the defaults; both include credentials so keep them secret). |
| `RABBITMQ_PASSWORD` | RabbitMQ user password. |
| `RABBITMQ_URL` | AMQP connection string (if overriding the default that derives from host/user/password). |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Object storage credentials required by the API and bootstrap step. |
| `JWT_ACCESS_TOKEN_SECRET` / `JWT_REFRESH_TOKEN_SECRET` | Secrets that sign and verify JWTs. |
| `OTP_SENDER_API_KEY` | API key for the external OTP provider (leave blank if you do not dispatch OTPs externally). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push VAPID keys/subject used by the API to send push notifications. |
| `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` | Treat as secret if your analytics vendor forbids public exposure. |
| Any other third-party tokens (e.g., `OTEL_EXPORTER_OTLP_HEADERS`, extra webhook URLs, etc.). |

All of these values are read by `docker-compose-prod.yml` at deploy time. The deploy workflow exports them and runs:

```bash
docker stack deploy -c docker-compose-prod.yml my-ads --resolve-image never
```

No registry login or image pull is needed. Images are built locally by the CI build jobs before the deploy step.
```

---

## Interacting with the API

- **Health:** `GET /public/health` (no prefix) — returns status + dependency map.
- **Info:** `GET /public/info` — exposes project name/version (uses `npm_package_version`).
- **Swagger UI:** `GET /docs` — interactive OpenAPI docs (JWT secured endpoints require a bearer token via “Authorize”). Raw spec available at `/docs-json`.
- **Authentication:** `POST /api/auth/login`, `/api/auth/register` (JWT response).
- **Swagger/OpenAPI:** Auto-generated with `@nestjs/swagger`; browse at `/docs` (JSON at `/docs-json`).
- **WebSockets:** Socket.IO server accessible on the same port (`/socket.io`, adapter uses Redis).

### Saved filter notifications

- Realtime alerts are tied to saved filter sets. Enable or disable them per filter from **Dashboard → Saved filters**; view the live feed under **Dashboard → Notifications**.
- The scheduler scans posts from the last `NOTIFICATION_WINDOW_MINUTES`, persists matches, and publishes jobs to the `notification` RabbitMQ queue. Delivery respects the user's websocket session and retries every `NOTIFICATION_RETRY_INTERVAL_MS` up to `NOTIFICATION_MAX_ATTEMPTS`.
- Notifications are stored with status metadata (`PENDING`, `SENT`, `FAILED`) so users can review history even after reconnecting. Entries older than `NOTIFICATION_RETENTION_DAYS` are purged hourly.
- Websocket delivery targets per-user rooms (multi-device friendly). When `NOTIFICATION_PUSH_ALWAYS=true`, push delivery runs even if a websocket connection is active.
- Push delivery is handled by a PWA service worker. The UI serves `/service-worker.js` from `ui/public` and imports `/push-sw.js` for push/click handlers.
- Notification clicks route to `/dashboard/posts/{postId}`; toast previews show up in the UI with swipe-to-dismiss and a max of 3 visible at a time.
- Required push envs: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (and optionally `NOTIFICATION_PUSH_ALWAYS` to always attempt push).

---

## Tips & Troubleshooting

- When running outside Docker, set `REDIS_HOST_FALLBACK=localhost` or `host.docker.internal` to reach the Redis container.
- Husky pre-commit hook runs lint-staged, typecheck, and targeted Jest tests; ensure ESLINT_USE_FLAT_CONFIG=false when invoking ESLint manually.
- The health service caches the last failure per dependency to provide fast responses during outages; adjust `HEALTH_FAILURE_CACHE_MS` if you need different behaviour.
- For TLS-enabled Redis, set `REDIS_TLS=true` and supply proper certificates (handled automatically by `ioredis` when `tls` object is present).
- Grafana dashboards are provisioned from `observability/grafana/provisioning`; customize JSON there to extend observability out of the box.
- Maps/tiles: TileServer-GL is wired in compose (port `${MAP_TILES_PORT:-7235}`) and expects `maps/iran.mbtiles` locally or `${MAP_TILES_PATH:-/var/lib/my-ads/maps}/iran.mbtiles` in prod.
  - **Dev** uses port `6235` (set `MAP_TILES_PORT=6235` in `.env`).
  - **Prod** uses port `7235` (set in `.env.prod`).
  - Install tiles (choose one):
    - **Sync a prebuilt file**: set `MBTILES_URL` to a hosted MBTiles and run `./scripts/sync-tiles.sh` (uses `MAP_TILES_PATH`, default `./maps/iran.mbtiles`). Use this in CI before `docker compose up`.
    - **Build Iran locally**: run `OMT_POSTGRES_PORT=<free_port> MIN_ZOOM=0 MAX_ZOOM=14 ./scripts/build-iran-tiles.sh` and wait for completion (tens of minutes). The script drops a full `maps/iran.mbtiles`.
  - After syncing/building, restart the tileserver: `docker compose --profile full restart tileserver`.
  - Default UI uses same-origin tiles: `NEXT_PUBLIC_MAP_TILE_BASE_URL=/map` with OSM Bright style (128 layers, street names, POIs). The style is served from `ui/public/map-assets/style.json` (self-hosted, no internet) or toggled to CDN via `NEXT_PUBLIC_MAP_STYLE_CDN_URL` in `.env`. Sprites and fonts are hosted locally under `/map-assets/` and `/map/fonts/`.
  - If you change tile paths/ports or revert to dedicated domains, also adjust `Caddyfile.central` (proxy `/map`, `/data`, `/fonts` to the tileserver) and `NEXT_PUBLIC_MAP_TILE_BASE_URL`.

---

## Divar Post Crawler Pipeline

The system includes a **5-stage crawling pipeline** that fetches, parses, and stores classified adverts from Divar.ir. Each stage is a standalone command and can run independently:

| Command | Stage | Purpose |
|---|---|---|
| `npm run divar:harvest-posts` | 1 — Harvest | Search Divar by category × location, enqueue post tokens |
| `npm run divar:fetch-posts` | 2 — Fetch | Fetch raw JSON detail for each token from Divar API |
| `npm run divar:analyze-posts` | 3 — Analyze | Parse raw JSON → normalized `DivarPost` record in DB |
| `npm run divar:sync-media` | 4 — Media Sync | Download CDN images to local MinIO storage |

All stages share a common cron schedule (default: `every 10 seconds`) activated via `ENABLE_CRON_JOBS=true`.

The **analyze stage** is the core transformation engine — it converts Divar's protobuf-style widget payload into a universal `ParsedDivarPost` intermediate representation, then persists it to the `DivarPost` table. This same IR is the extension point for adding crawlers from other sources.

See [doc/divar-crawler-pipeline.md](doc/divar-crawler-pipeline.md) for complete documentation including data structures, parser widget mappings, Persian text normalization, and extension guides.

## MelkRadar Crawler Pipeline

The MelkRadar pipeline fetches pre-enriched adverts from the MelkRadar dashboard (aggregates Divar + Sheypoor). Unlike the Divar pipeline, data arrives already parsed with phone numbers and prices included.

| Command | Stage | Purpose |
|---|---|---|
| `npm run melkradar:get-archives` | 1 — Get Archives | Fetch archive folder list and store in `AdminMelkradarArchive` table |

An active MelkRadar session (`AdminMelkradarSession`) is required — create one in the admin panel with cookies from the browser.

See [doc/melkradar-crawler.md](doc/melkradar-crawler.md) for complete documentation including API response fields, data model, and comparison with the Divar pipeline.

---

## License

MIT © contributors to the My Ads project.
