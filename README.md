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

## Prometheus, Observability & Metrics

- `GET /metrics` exposes Prometheus-compatible metrics (HTTP latency histogram, health gauges, queue counters, etc.).
- Health dependency metrics: `health_dependency_status{component=...}` (gauge) and `health_dependency_latency_seconds` (histogram).
- `GET /public/health` returns structured JSON including `status`, `failedComponents`, and per-dependency details with retry/backoff caching.
- OpenTelemetry can push traces to an OTLP endpoint when enabled via `OTEL_ENABLED=true`.
- Logging is handled by Pino; pretty-printing is controlled with `LOG_PRETTY`.

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
