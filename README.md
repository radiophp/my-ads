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

The server loads `.env`, `.env.local`, and environment-specific variants automatically, including parent-directory files when running inside `/server`.

### 3. Database Migrations

```bash
cd server
npm run prisma:migrate -- --name init
```

### 4. Local Development

```bash
npm run start:dev
```

The API listens on `http://localhost:6200` (public routes under `/public`, authenticated API under `/api` by default). Fastify reloads on file changes.

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
| Grafana | 3000 | provisions dashboards from `observability/grafana/...` |

Stop with `docker compose down`.

### 7. Production Build

```bash
cd server
npm run build
npm run start:prod   # serves compiled dist/main.js
```

Ensure the same environment variables are available in production.

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

Environment variables not listed above are either optional feature toggles or inherit defaults inside module configuration files.

---

## Interacting with the API

- **Health:** `GET /public/health` (no prefix) — returns status + dependency map.
- **Info:** `GET /public/info` — exposes project name/version (uses `npm_package_version`).
- **Swagger UI:** `GET /docs` — interactive OpenAPI docs (JWT secured endpoints require a bearer token via “Authorize”). Raw spec available at `/docs-json`.
- **Authentication:** `POST /api/auth/login`, `/api/auth/register` (JWT response).
- **Swagger/OpenAPI:** Auto-generated with `@nestjs/swagger`; browse at `/docs` (JSON at `/docs-json`).
- **WebSockets:** Socket.IO server accessible on the same port (`/socket.io`, adapter uses Redis).

---

## Tips & Troubleshooting

- When running outside Docker, set `REDIS_HOST_FALLBACK=localhost` or `host.docker.internal` to reach the Redis container.
- Husky pre-commit hook runs lint-staged, typecheck, and targeted Jest tests; ensure ESLINT_USE_FLAT_CONFIG=false when invoking ESLint manually.
- The health service caches the last failure per dependency to provide fast responses during outages; adjust `HEALTH_FAILURE_CACHE_MS` if you need different behaviour.
- For TLS-enabled Redis, set `REDIS_TLS=true` and supply proper certificates (handled automatically by `ioredis` when `tls` object is present).
- Grafana dashboards are provisioned from `observability/grafana/provisioning`; customize JSON there to extend observability out of the box.

---

## License

MIT © contributors to the My Ads project.
