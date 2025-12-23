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

- **Auth Module (`modules/auth`)** — JWT access + refresh token flow, guards, strategies, login/register endpoints.
- **Users Module (`modules/users`)** — CRUD services for user entities via Prisma.
- **Public Module (`modules/public`)** — Health, info, and other publicly accessible routes. Rate limited by default.
- **Uploads Module (`modules/uploads`)** — File upload orchestration layered over MinIO/S3 storage.
- **User Panel & Admin Panel (`modules/user-panel`, `modules/admin-panel`)** — Domain-specific APIs protected by role guards.
- **Telegram Module (`modules/telegram`)** — Bot entrypoint to collect user phone via contact share and deliver posts (albums) to users.
- **News Module (`modules/news`)** — News categories/tags plus public list/detail endpoints and admin CRUD for publishing updates.
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
| Tileserver | 8080 | serves Iran MBTiles (map) at `/map` |

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

After a restore, mark completed queue rows as freshly fetched to avoid mass reactivation in harvest:

```sql
UPDATE "PostToReadQueue"
SET "lastFetchedAt" = now(), "updatedAt" = now()
WHERE status = 'COMPLETED';
```

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

### Media mirroring

`DivarPostMedia` now stores `localUrl`/`localThumbnailUrl`. The `divar:sync-media` cron consumes CDN-backed rows in batches of 25, downloads both the primary and thumbnail assets (capped at two downloads per second with five retries and graceful 404 handling), and uploads them to MinIO using the same path layout (`https://<our-domain>/<bucket>/static/photo/...`). API responses automatically prefer local URLs when present and fall back to the original Divar CDN links otherwise. Control the cadence via `DIVAR_MEDIA_SYNC_CRON`.

---

## Frontend (Next.js UI)

The customer-facing UI lives in `ui/` and is built with **Next.js 16**, **React 19**, and `next-intl` for localisation.

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

### 2. Linting & Typechecking

```bash
npm run lint           # ESLint (internally sets ESLINT_USE_FLAT_CONFIG=false)
npm run typecheck      # TypeScript --noEmit
```

Tailwind class ordering rules are enabled; ESLint may rewrite class strings during `--fix`.

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

GitHub Actions (`.github/workflows/ci.yml`) run on every push and pull request. The pipeline currently spans eight jobs:

1. **server-lint** — installs dependencies in `server/` and runs ESLint.
2. **server-typecheck** — reruns dependency install and executes `npm run typecheck`.
3. **server-test** — boots PostgreSQL + Redis services, generates Prisma client, runs unit tests (`npm test -- --runInBand`) and e2e tests (`npm run test:e2e`).
4. **server-build** — ensures the backend compiles (`npm run build`).
5. **ui-lint** — installs UI dependencies and runs ESLint with Tailwind rules.
6. **ui-typecheck** — executes `npm run typecheck` in `ui/`.
7. **ui-test** — runs Vitest (`--passWithNoTests`) and installs Playwright browsers; the Playwright execution step is currently disabled with `if: ${{ false }}` while the suite is stabilised.
8. **ui-build** — performs `npm run build` to validate the Next.js production bundle.

All jobs run on Node.js 22 to mirror local prerequisites. The UI tests are tolerant of empty suites, so adding Vitest specs will not require pipeline changes. Re-enable Playwright by removing the conditional guard once the e2e suite is ready.

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
| `NOTIFICATION_RETRY_INTERVAL_MS` | `180000` | Delay (ms) between websocket delivery attempts when the user is offline. |
| `NOTIFICATION_MAX_ATTEMPTS` | `3` | Maximum websocket delivery attempts before a notification is marked as failed. |
| `NOTIFICATION_RETENTION_DAYS` | `3` | Retention policy for persisted notifications (older entries are purged hourly). |

Environment variables not listed above are either optional feature toggles or inherit defaults inside module configuration files.

---

## Production deployment (Docker Swarm)

`docker-compose-prod.yml` defines the production stack expected to run on a Docker Swarm cluster. The stack consumes container images that are already built in CI (for example, the GitHub Actions workflow can push `ghcr.io/<org>/my-ads-api` and `ghcr.io/<org>/my-ads-ui`). A typical deployment job performs the following steps:

1. Log in to the container registry that hosts the pre-built images.
2. Export the required environment variables (usually sourced from GitHub Actions variables and secrets).
3. Run `docker stack deploy -c docker-compose-prod.yml my-ads --with-registry-auth` on the Swarm manager node.

The stack runs **two API-related services**:

- `api` – the primary NestJS HTTP service that serves requests.
- `api-cron` – a lightweight replica of the same container that executes `node dist/scripts/run-cron-scheduler.js` with `ENABLE_CRON_JOBS=true`. This process is isolated from the HTTP pods so scheduled jobs keep running even when you scale the API instances or deploy rolling updates.

### GitHub Actions variables (safe to expose)

| Name | Description |
| --- | --- |
| `API_IMAGE` | Fully qualified reference to the API image (e.g., `ghcr.io/toncloud/my-ads-api`). |
| `API_IMAGE_TAG` | Tag that should be deployed (`latest`, `main`, `${{ github.sha }}` …). |
| `UI_IMAGE` | UI image reference (e.g., `ghcr.io/toncloud/my-ads-ui`). |
| `UI_IMAGE_TAG` | Tag for the UI image. |
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
| `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` | Treat as secret if your analytics vendor forbids public exposure. |
| Any other third-party tokens (e.g., `OTEL_EXPORTER_OTLP_HEADERS`, extra webhook URLs, etc.). |

All of these values are read by `docker-compose-prod.yml` at deploy time. The deploy workflow should export them with something like:

```yaml
env:
  API_IMAGE: ${{ vars.API_IMAGE }}
  API_IMAGE_TAG: ${{ vars.API_IMAGE_TAG }}
  POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}

run: |
  docker stack deploy -c docker-compose-prod.yml my-ads --with-registry-auth
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

---

## Tips & Troubleshooting

- When running outside Docker, set `REDIS_HOST_FALLBACK=localhost` or `host.docker.internal` to reach the Redis container.
- Husky pre-commit hook runs lint-staged, typecheck, and targeted Jest tests; ensure ESLINT_USE_FLAT_CONFIG=false when invoking ESLint manually.
- The health service caches the last failure per dependency to provide fast responses during outages; adjust `HEALTH_FAILURE_CACHE_MS` if you need different behaviour.
- For TLS-enabled Redis, set `REDIS_TLS=true` and supply proper certificates (handled automatically by `ioredis` when `tls` object is present).
- Grafana dashboards are provisioned from `observability/grafana/provisioning`; customize JSON there to extend observability out of the box.
- Maps/tiles: TileServer-GL is wired in compose (ports `${MAP_TILES_PORT:-7235}` dev, `${MAP_TILES_PORT:-8235}` prod) and expects `maps/iran.mbtiles` locally or `${MAP_TILES_PATH:-/var/lib/my-ads/maps}/iran.mbtiles` in prod.
  - Install tiles (choose one):
    - **Sync a prebuilt file**: set `MBTILES_URL` to a hosted MBTiles and run `./scripts/sync-tiles.sh` (uses `MAP_TILES_PATH`, default `./maps/iran.mbtiles`). Use this in CI before `docker compose up`.
    - **Build Iran locally**: run `OMT_POSTGRES_PORT=<free_port> MIN_ZOOM=0 MAX_ZOOM=14 ./scripts/build-iran-tiles.sh` and wait for completion (tens of minutes). The script drops a full `maps/iran.mbtiles`.
  - After syncing/building, restart the tileserver: `docker compose --profile full restart tileserver`.
  - Default UI config uses same-origin tiles: `NEXT_PUBLIC_MAP_TILE_BASE_URL=/map`, so requests hit `/map/styles/basic-preview/style.json` and `/map/styles/basic-preview/{z}/{x}/{y}.pbf|.png` on the app domain (no CORS).
  - If you change tile paths/ports or revert to dedicated domains, also adjust `Caddyfile.central` (proxy `/map`, `/data`, `/fonts` to the tileserver) and `NEXT_PUBLIC_MAP_TILE_BASE_URL`.

---

## License

MIT © contributors to the My Ads project.
