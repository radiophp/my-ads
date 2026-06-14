# Repository Guidelines

## Project Structure
- **Backend**: `server/src/` — NestJS + Fastify, modules at `modules/*`, platform services at `platform/*`, common utils at `common/*`
- **Frontend**: `ui/src/` — Next.js 16 + React 19, pages at `app/`, components at `components/`, state at `features/`
- **Infra**: Root-level `docker-compose.yml` (dev), `docker-compose-prod.yml` (swarm), `Caddyfile.central` (dev), `Caddyfile.prod` (prod)
- **Config**: `.env` (dev), `.env.prod` (prod secrets), `server/prisma/schema.prisma` (DB schema)
- **Observability**: `observability/` — Grafana dashboards, Prometheus/Loki/Tempo configs, OTEL collector
- **CI**: `.github/workflows/ci.yml` — self-hosted runner builds + swarm deploy

## Backend Modules (`server/src/modules/*`)
| Module | Purpose |
| --- | --- |
| `auth` | OTP login, JWT, guards |
| `users` | CRUD, roles, admin management |
| `admin-panel` | Admin dashboard stats/actions |
| `user-panel` | User dashboard data |
| `divar-posts` | Harvest, fetch, analyze, media sync, contact fetch, stats; admin CRUD |
| `divar-categories` | Category tree sync, filter widgets |
| `melkradar` | MelkRadar archive, post fetch, divar conversion |
| `arka` | Arka phone fetch, transfer, session management |
| `news` | Categories, tags, crawlers (Eghtesad/Khabaronline/Asriran), CRUD |
| `blog` | Categories, tags, sources, CRUD |
| `cities` / `provinces` / `districts` | Location data CRUD |
| `uploads` | File upload to MinIO |
| `slides` | Homepage slides CRUD |
| `featured-posts` | Featured post management |
| `notifications` | Push, Bale, Telegram; queue processors, matcher, maintenance |
| `phone-fetch` | Business title refresh, phone data |
| `website-settings` | Contact/social/about-us, admin updates |
| `seo-settings` | SEO metadata, admin updates |
| `saved-filters` | User saved search filters |
| `ring-binders` | Post ring binders (collections) |
| `packages` | Subscription packages |
| `subscriptions` | User subscriptions |
| `invite-codes` | Referral codes |
| `discount-codes` | Discount code management |
| `bale` | Bale messenger bot integration |
| `telegram` | Telegram bot integration |
| `public` | Health check, public endpoints |
| `admin-divar-sessions` | Divar crawl session management |

## Platform Services (`server/src/platform/*`)
| Service | Purpose |
| --- | --- |
| `database/` | Prisma module + service |
| `cache/` | Redis module, caching service |
| `queue/` | RabbitMQ module, queue service |
| `storage/` | MinIO/S3 file storage |
| `config/` | All NestJS configs (app, db, redis, jwt, minio, rabbitmq, etc.) |
| `metrics/` | Prometheus metrics (HTTP latency, health gauges, queue counters) |
| `observability/` | OpenTelemetry tracing setup |
| `logging/` | Pino logger module |
| `otp/` | OTP generation & validation |
| `http/` | Favicon controller, HTTP module |
| `websocket/` | Socket.IO adapter, websocket gateway |

## Frontend Structure (`ui/src/`)
| Directory | Purpose |
| --- | --- |
| `app/` | Next.js pages (admin, dashboard, blog, news, login, about, preview, offline) |
| `components/` | Shared components (ui, layout, dashboard, admin, blog, news, forms, editor, etc.) |
| `features/api/` | RTK Query: `baseApi.ts` (shared slice), `endpoints/*.ts` (23 domain endpoint files) |
| `features/auth/` | Auth Redux slice |
| `features/notifications/` | Notifications slice, push subscription, Bale socket, native notifications |
| `features/search-filter/` | Search/filter Redux slice |
| `lib/` | Utility functions and helpers |
| `hooks/` | Custom React hooks |
| `messages/` | i18n locale JSON files |
| `public/map-assets/` | Self-hosted map style, sprites, RTL plugin |

## Docker Compose Services

### Dev (`docker-compose.yml`) — 19 services

| Service | Image | Internal Port | Host Port | Purpose |
| --- | --- | --- | --- | --- |
| `postgres` | postgres:16-alpine | 5432 | 6201 | Primary database |
| `redis` | redis:7-alpine | 6379 | 6202 | Caching |
| `minio` | minio/minio | 9000/9001 | 6204/6205 | Object storage |
| `rabbitmq` | rabbitmq:3.13-management | 5672/15672 | 6213/6214 | Message queue |
| `api` | my-ads-api:latest | 6300 | 6200 | NestJS backend |
| `telegram-bot` | my-ads-api:latest | — | — | Telegram bot process |
| `bale-bot` | my-ads-api:latest | — | — | Bale bot process |
| `pgbackrest-backup` | my-ads-backup:latest | — | — | DB backup to MinIO |
| `tileserver` | maptiler/tileserver-gl:v4.8.0 | 8080 | 7235 | Map tile server |
| `otel-collector` | otel/opentelemetry-collector-contrib:0.99.0 | 4318/4317 | 6317/6318 | Trace collector |
| `loki` | grafana/loki:2.9.3 | 3100/9096 | 6319/6320 | Log aggregation |
| `promtail` | grafana/promtail:2.9.3 | — | — | Log agent |
| `tempo` | grafana/tempo:2.4.1 | 3200/4317 | 6309/6321 | Distributed tracing |
| `prometheus` | prom/prometheus:v2.49.1 | 9090 | 6322 | Metrics |
| `grafana` | grafana/grafana:10.4.1 | 3000 | 6323 | Dashboards |
| `ui` | my-ads-ui:latest | 6306 | 6005 | Next.js frontend |
| `caddy` | caddy:alpine | 80/443 | 80/443/2015 | Reverse proxy + TLS |
| `dnsproxy` | coredns/coredns:latest | 53 | 53 | DNS proxy |
| `cloudflared` | cloudflare/cloudflared:latest | — | — | Cloudflare Tunnel |
| **Network** | `app_net` (shared bridge) | | | |

### Prod (`docker-compose-prod.yml`) — 20 services (adds `api-cron`)

Same as dev except:
- Ports differ (published `6300-6323` range, internal `5432-6323`)
- `api-cron` runs scheduled cron jobs
- `Caddyfile.prod` mounted at `/etc/caddy/Caddyfile`
- `.env.prod` loaded for secrets
- No Telegram bot in compose (runs elsewhere)
- Volumes for postgres, minio, redis, rabbitmq, loki, tempo, prometheus, grafana, caddy data

## Caddy Routing

### Dev (`Caddyfile.central`)
- `map.mahanfile.com` → `host.docker.internal:8080` (tileserver)
- `dev.mahanfile.com`:
  - `/storage/*` → `host.docker.internal:6204` (minio)
  - `/map/*` → `172.30.0.20:8080` (tileserver, static IP)
  - `/socket.io/*`, `/api/*` → `host.docker.internal:6200` (api)
  - fallback → `host.docker.internal:6005` (ui)

### Prod (`Caddyfile.prod`)
- `mahanfile.com, www.mahanfile.com`:
  - `/storage*` → `minio:6304`
  - `/map/*` → `tileserver:8080` (trailing slash critical — prevents `/map-assets/*` matching)
  - `/socket.io/*`, `/api/*` → `api:6300`
  - fallback → `ui:6306`
- `map.mahanfile.com` → `tileserver:8080`
- Cloudflare DNS TLS, JSON logging, CORS headers

## Observability Stack
| Component | Port(s) | Config | Purpose |
| --- | --- | --- | --- |
| Prometheus | 6322 | `observability/prometheus.yml` | Metrics scraping (15s interval from api + tempo) |
| Alert Rules | — | `observability/prometheus-alerts.yml` | `DependencyDown` alert (health_status==0 >1min) |
| Loki | 6319 (HTTP), 9096 (gRPC) | `observability/loki-config.yaml` | Log aggregation (boltdb-shipper, 24h retention) |
| Promtail | — | `observability/promtail-config.yaml` | Docker log agent (filters to `my-ads-production` stack, drops >24h) |
| Tempo | 6309 (HTTP), 6321 (gRPC) | `observability/tempo.yaml` | Distributed tracing (24h block retention) |
| OTEL Collector | 6317 (gRPC), 6318 (HTTP) | `observability/otel-collector-config.yaml` | Trace receiver → batches → Tempo |
| Grafana | 6323 | `observability/grafana/provisioning/` | Dashboards at `monitoring.mahanfile.com` |

**Auto-provisioned Grafana dashboards** (from `observability/grafana/provisioning/dashboards/`):
- **API Observability** — RPS, error rate, latency p50/p90/p99, top paths, dependency health
- **Logs Overview** — Log volume by service (bar gauge)
- **Service Health Overview** — State timeline of `health_dependency_status`

## Map Tile Service
- **TileServer-GL v4.8.0** — serves Iran vector tiles (`maps/iran.mbtiles`, 905 MB, maxzoom 14)
- **OSM Bright style** — self-hosted at `ui/public/map-assets/style.json` (128 layers, street names, POIs)
- **Persian labels**: `Noto Naskh Arabic` fonts in `maps/fonts/` (Regular/Bold, 515 PBF files)
- **RTL plugin**: `maplibre-rtl-text.js` loaded via `setRTLTextPlugin()` in `post-location-map.tsx`
- **Font scaling**: 0.55x applied to `text-size` (Noto Naskh Arabic ~1.8x larger than Noto Sans)
- **Config**: `maps/config.json` with `serveAllFonts: true`
- **Frontend component**: `ui/src/components/dashboard/divar-posts/post-location-map.tsx` — style fetch, RTL loading, text-field rewrite to `{name:nonlatin}`, tile source rewrite to `/map/data/v3/{z}/{x}/{y}.pbf`
- **Production deploy**: SCP `iran.mbtiles` + `config.json` + `fonts/` to `${MAP_TILES_PATH}` → force-update tileserver + caddy

## CI/CD Pipeline (`.github/workflows/ci.yml`)

**Triggers**: `push` / `pull_request` to main

**Job dependency graph**:
```
changes ──► ui-build ──► build-ui-image ─┐
                                          ├──► deploy
server-lint ─► server-test ─► server-build ┼──► build-api-image ─┘
server-typecheck ─┘                        └──► build-backup-image
ui-lint ─► ui-test ─┘
ui-typecheck ─┘
```

| Job | Runner | Depends On | Key Steps |
| --- | --- | --- | --- |
| `changes` | ubuntu-latest | — | Detect UI changes via path filter |
| `server-lint` | ubuntu-latest | — | npm install → npm run lint |
| `server-typecheck` | ubuntu-latest | — | npm install → npm run typecheck |
| `server-test` | ubuntu-latest | lint+typecheck | Generate Prisma → DB schema → unit tests → e2e (Postgres+Redis containers) |
| `server-build` | ubuntu-latest | server-test | npm run build |
| `ui-lint` | ubuntu-latest | — | npm install → npm run lint |
| `ui-typecheck` | ubuntu-latest | — | npm install → npm run typecheck |
| `ui-test` | ubuntu-latest | lint+typecheck | Vitest + Playwright (currently disabled) |
| `ui-build` | ubuntu-latest | changes+ui-test | npm run build (only if UI changed) |
| `build-api-image` | **self-hosted** | server-build | Docker BuildKit → `my-ads-api:latest` |
| `build-backup-image` | **self-hosted** | server-build | Docker BuildKit → `my-ads-backup:latest` |
| `build-ui-image` | **self-hosted** | ui-build | Docker BuildKit → `my-ads-ui:latest` (passes NEXT_PUBLIC_* build args) |
| `deploy` | **self-hosted** | all builds above | Validate config → `docker stack deploy -c docker-compose-prod.yml --resolve-image never` → wait for PG → `prisma migrate deploy` → force-update api, api-cron, telegram-bot, bale-bot, ui |

**Self-hosted runner specifics**:
- Machine: `armita@192.168.31.170 -p 2222` (WSL2 Ubuntu 24.04)
- Runner: `/home/armita/actions-runner/` (systemd service, auto-starts)
- Docker Desktop on WSL2 does NOT route published ports to VM — use `docker run --network "${STACK_NAME}_app_net"` instead of `localhost`
- No registry push — images built locally with `--resolve-image never`
- BuildKit cache mounted from host for faster rebuilds

## Scripts Reference

### Build & Data Scripts (`scripts/`)
| Script | Purpose |
| --- | --- |
| `build-iran-tiles.sh` | Build Iran mbtiles from OpenMapTiles (OMT_POSTGRES_PORT, MIN_ZOOM, MAX_ZOOM) |
| `sync-tiles.sh` | Fetch prebuilt mbtiles (MBTILES_URL) |
| `get-iran-mbtiles.sh` | Alternative Iran tile download |
| `sync-gh-vars.sh` | Sync GitHub Actions secrets from .env |
| `phone-fetch-worker.js` | Phone fetch worker process |
| `fetch_divar_phones.sh` | Divar phone number harvester launcher |
| `pgbackrest/` | pgBackRest configuration |

### Server Scripts (`npm run` from `server/`)
| Command | Purpose |
| --- | --- |
| `start:dev` | Nest dev with hot reload |
| `build` | Compile to `server/dist` |
| `prisma:generate` | Generate Prisma client |
| `prisma:migrate` | Create migration (`--name <name>`) |
| `prisma:deploy` | Apply pending migrations |
| `sync:divar-categories` | Sync Divar category tree |
| `sync:divar-category-filters` | Sync Divar filter widgets |
| `divar:harvest-posts` | Harvest new posts from Divar |
| `divar:fetch-posts` | Fetch post details |
| `divar:analyze-posts` | Analyze post content |
| `divar:sync-media` | Sync post media to MinIO |
| `divar:fetch-contacts` | Fetch phone contacts from Divar |
| `melkradar:*` | MelkRadar archive, fetch, divar conversion |
| `arka:*` | Arka phone fetch & transfer |
| `news:crawl:*` | Eghtesad, Khabaronline, Asriran crawlers |
| `telegram:bot` / `telegram:bot:dev` | Telegram bot (prod/dev) |
| `bale:bot` / `bale:bot:dev` | Bale bot (prod/dev) |
| `cron:scheduler` | Run cron job scheduler |
| `test` / `test:e2e` / `test:cov` | Jest test suites |

### UI Scripts (`npm run` from `ui/`)
| Command | Purpose |
| --- | --- |
| `dev` | Next.js dev server (port 6005) |
| `build` | Production build |
| `lint` | ESLint |
| `typecheck` | TypeScript check |
| `test` | Vitest (--passWithNoTests) |
| `test:e2e` | Playwright e2e |
| `storybook` / `storybook:build` | Storybook dev/build |

## Coding Style & Naming Conventions
- TypeScript: ESLint + Prettier defaults (2-space indent, trailing commas, single quotes)
- Files: kebab-case (`user-panel.module.ts`), classes: PascalCase, env vars: SCREAMING_SNAKE_CASE
- Controllers thin, DTOs with `class-validator`, reuse platform services
- Feed loading: 12 skeleton cards styled same as post cards (`ui/src/components/dashboard/divar-posts-feed.tsx`)
- Post codes: numeric (starting at 1000), stored in DB, searchable via header code search (rate-limited)
- Storage URLs: same-origin `/storage/<bucket>/<key>` (no subdomain)
- Divar category filter labels: keep `dashboard.filters.categoryFilters.widgetLabels` in locale JSON with both `filter_*` and raw keys

## Authentication & Security
- **OTP login**: `POST /auth/request-otp` → `POST /auth/verify-otp` (returns JWT). Dev code `1234`
- **Turnstile**: Cloudflare Turnstile gated by `ENABLE_TURNSTILE` admin toggle
- **Phone input**: Leading `0` preserved visually, stripped on submit (E.164 format)
- **Bale linking**: `BaleUserLink` filtered by current bot ID (`BALE_BOT_TOKEN` numeric prefix) to avoid cross-env stale links
- **CLOUDFLARE_API_TOKEN**: GitHub secret (not in .env.prod)

## Pagination Strategy (Divar Dashboard)
- No Prisma `cursor`/`skip` for large tables (full-table scans on tied `publishedAt`)
- Manual `WHERE (publishedAt, createdAt, id) < (cursor...)` tuple comparisons via `runQuery`/`buildWhereClause`
- Multi-city queries: `UNION ALL` per city to hit composite indexes
- Required indexes (run after DB restore):
  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_cityId_publishedAt_idx" ON "DivarPost" ("provinceId", "cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_cityId_publishedAt_idx" ON "DivarPost" ("cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_publishedAt_idx" ON "DivarPost" ("provinceId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostToReadQueue_status_requestedAt_idx" ON "PostToReadQueue" (status, "requestedAt");
  ```

## Testing Guidelines
- Jest for backend (`*.spec.ts` unit/integration, `*.e2e-spec.ts` HTTP)
- Fastify test harness at `src/tests/setup-test.ts`
- Vitest for UI, Playwright for e2e
- Avoid external network calls in specs
- Server code coverage thresholds in `jest.config.js`

## Commit & PR Guidelines
- Prefix: lowercase type (`add`, `fix`, `chore`, `docs`, `feat`) + imperative summary
- Squash WIP commits; automated release tooling expects tidy histories
- PRs: scope, solution, verification (tests, screenshots, curl output)
- Call out env or migration steps explicitly

## DB Backup & Restore
- Dev: `PGPASSWORD=postgres pg_dump -Fc -h host.docker.internal -p 6201 -U postgres -d my_ads -f /tmp/dev-backup.dump`
- Prod: `PGPASSWORD=zQ5gG7k3S9nK2bFw pg_restore --clean --if-exists --no-owner --no-acl -h host.docker.internal -p 6301 -U mahan_admin -d mahan_file /tmp/dev-backup.dump`
- Automated: `pgbackrest-backup` → MinIO bucket `db-backup` (AES-256-CBC, 30-day retention, Telegram delivery)
- **Post-Restore SQL**: Run autovacuum tuning + indexes + pg_stat_statements (see "Required indexes" above)

## Production Environment (WSL)

### Machine Access
- SSH: `ssh armita@192.168.31.170 -p 2222` (password in .env.prod)
- WSL2 Ubuntu 24.04 on `DESKTOP-766QUFO`
- Docker Desktop (ports NOT routable to VM — use service names on `app_net`)

### Postgres Settings (`docker-compose-prod.yml`)
- `shared_preload_libraries=pg_stat_statements`
- `track_io_timing=on`
- `maintenance_work_mem=512MB`
- `autovacuum_vacuum_cost_limit=2000`

### Key Prod Config Files
- `.github/workflows/ci.yml` — CI/CD pipeline
- `docker-compose-prod.yml` — Swarm stack definition
- `Caddyfile.prod` — Production TLS + routing
- `.env.prod` — Production secrets (CLOUDFLARE_API_TOKEN as GitHub secret)
- `cloudflare/production/tunnel.json` — Cloudflare tunnel credentials
