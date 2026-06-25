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
| `auth` | OTP login, Bale mini app auth, JWT, guards, device management (sessions, challenger detection, WS push) |
| `users` | CRUD, roles, admin management |
| `admin-panel` | Admin dashboard stats/actions |
| `user-panel` | User dashboard data |
| `divar-posts` | Harvest, fetch, analyze, media sync, contact fetch, stats; admin CRUD |
| `divar-categories` | Category tree sync, filter widgets |
| `melkradar` | MelkRadar archive, post fetch, divar conversion |
| `arka` | Arka phone fetch (search-based discovery), phone fetch + store, transfer to DivarPost, session management |
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
| `bale` | Bale messenger bot integration, mini app auth utils (HMAC validation), share-post API, deep link builder, web_app_data handler, `forceSendPhotos` for share flow |
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
| `components/ui/searchable-select.tsx` | Reusable searchable select — button triggers dropdown with search input + filtered option list; `Option` supports `searchText` for slug-based search |
| `components/ui/location-cascade.tsx` | Reusable province → city → district cascade using `SearchableSelect` with cascading disabled states |

## Admin Pages
| Route | Component | Description |
| --- | --- | --- |
| `/admin/divar-posts-with-phones` | `AdminPostsWithPhonesManager` | Table of DivarPosts with phone numbers from 3 sources (Divar, Arka, MelkRadar). Filters: location cascade (province/city/district with search by name+slug), category select (depth 3, active, allowPosting, shows cat2 > cat3), businessType (personal/business), phoneFilter (has/none). Page-based pagination (20/page). Default province 895, default businessType personal. |

## Docker Compose Services

### Dev (`docker-compose.yml`) — 19 services

| Service | Image | Internal Port | Host Port | Purpose |
| --- | --- | --- | --- | --- |
| `postgres` | postgres:16-alpine | 5432 | 6201 | Primary database |
| `redis` | redis:7-alpine | 6379 | 6202 | Caching |
| `minio` | minio/minio | 9000/9001 | 6204/6205 | Object storage |
| `rabbitmq` | rabbitmq:3.13-management | 5672/15672 | 6213/6214 | Message queue |
| `api` | my-ads-api:latest | 6300 | 6200 | NestJS backend (has `BALE_BOT_USERNAME` for deep links) |
| `telegram-bot` | my-ads-api:latest | — | — | Telegram bot process |
| `bale-bot` | my-ads-api:latest | — | — | Bale bot process (has `BALE_BOT_USERNAME` for deep links) |
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
| `backup/manual-backup.sh` | Manual DB backup with timestamped filename |
| `backup/restore-latest.sh` | Interactive DB restore — lists backups (newest first), lets user pick one, restores with verbose progress |

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
| `melkradar:get-archives` | Fetch MelkRadar archive folders |
| `melkradar:fetch-posts` | Fetch MelkRadar posts from archives |
| `melkradar:to-divar` | Convert MelkRadar posts to DivarPost |
| `melkradar:phone-fetch` | MelkRadar listing-based phone fetch (default 10 pages, set `MAX_PAGE=XXX`) |
| `melkradar:phone-transfer` | Transfer fetched MelkRadar phones to DivarPost |
| `arka:fetch` | Arka search-based phone fetch (default 10 pages, set `MAX_PAGE=XXX`) |
| `arka:transfer` | Transfer fetched Arka phones to DivarPost |
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

## File Splitting Pattern

Large files are split by extracting pure utility functions/constants/types into separate modules:
- **Backend**: Extract into `*-utils.ts`, `*-constants.ts`, `*-types.ts`, `*-builder.ts`, `*-filter-builder.ts` within the same module directory
- **UI**: Extract sub-components into dedicated files within the same component directory
- Extracted modules must pass typecheck and lint; service classes themselves stay intact
- Currently split backend files: `divar-posts-admin.service.ts` (+filter builder), `divar-post-parser.ts` (+parser utils), `bale.service.ts` (+message builder, shared with telegram), `notifications.service.ts` (+utils), `divar-post-harvest.service.ts` (+types), `melkradar-to-divar.service.ts` (+constants)
  - Extracted modules with unit tests: `notifications-utils.ts`, `bale-message-builder.ts`
- Currently split UI files: `category-filters-preview.tsx` (→3 files), `divar-posts-feed.tsx` (→3), `profile-image-uploader.tsx` (→4), `phone-otp-login-form.tsx` (→3), `rich-text-editor.tsx` (→3), `active-filter-badges.tsx` (→2)

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
- **Bale mini app auth**: `POST /auth/bale-miniapp/auth` — HMAC-SHA256 validation of init data via `bale-miniapp-utils.ts`. Accepts `initData`, `phone?`, `deviceInfo?`. Validates against `BALE_BOT_TOKEN`, checks `auth_date` freshness (up to 24h), uses `formUrlDecode` (replaces `+` with space) for Persian text support. Fuzzy phone matching + user creation if no existing `BaleUserLink`. See `docs/bale-mini-app-auth.md` for full flow.
- **Device management**: `UserDevice` model with `userId_deviceId` compound unique. After OTP/Bale/BaleMiniApp login, server returns `status: 'confirm_device'` with `pendingSessionToken` + `currentDevice` info. If no other active devices exist, client auto-confirms; otherwise a confirmation dialog shows the existing device. Device validation runs in `JwtAuthGuard`/`RefreshJwtGuard` after JWT validation — checks `tokenVersion` match, throws `DEVICE_CHANGED` with challenger device info.
- **WebSocket push**: `io-server.ts` singleton (no DI, breaks circular deps) emits `device:challenged` to old device's `user:{userId}` room. Client listens via `useNotificationsSocket` and dispatches `deviceChanged`.
- **UI dialogs**: `DeviceConfirmDialog` (approve new device), `DeviceChallengerDialog` (notified of challenger). Both rendered at root `providers.tsx` to avoid redirect races. No `AlertDialogDescription` (renders `<p>`, breaks nesting rules — use plain `<div>`).
- **Session page**: `/dashboard/sessions` lists active devices with remove button, empty/error states.
- **Turnstile**: Cloudflare Turnstile gated by `ENABLE_TURNSTILE` admin toggle. Button disabled with spinner while widget loads (min 300ms so spinner is visible even during client-side nav with cached script). On error, button stays disabled.
- **Phone input**: Leading `0` preserved visually, stripped on submit (E.164 format)
- **Bale linking**: `BaleUserLink` filtered by current bot ID (`BALE_BOT_TOKEN` numeric prefix) to avoid cross-env stale links
- **Mini app detection**: localStorage flag `my-ads-bale-miniapp` set by `BaleMiniAppLogin`, read by `AuthInitializer` in `useLayoutEffect` and dispatched to Redux (`s.auth.isBaleMiniApp`). `MobileNavigationDrawer` and `UserMenu` hide logout button when `isBaleMiniApp` is true. Hydration guard in `BaleMiniAppLogin` prevents server/client mismatch. See `docs/bale-mini-app-auth.md`.
- **Share post via bot**: `POST /bale/share-post` (JWT-guarded) calls `sharePostToUser(userId, postId)` → `sendPostInternal` with `forceSendPhotos` to bypass `BALE_SEND_PHOTOS` config. Frontend RTK mutation `sharePostOnBale` in `features/api/endpoints/bale.ts`. Share dialog shows Bale button with proper SVG logo, loading spinner during API call, `window.Bale?.WebApp?.close()` on success.
- **Deep linking**: `buildBaleDeepLink(botUsername, postId)` → `https://ble.ir/<bot_username>?startapp=post_<id>`. Used in both caption `🔗` line and inline keyboard `web_app` button via `buildPostMetaMarkup()`. `buildCaption()` accepts optional `baleBotUsername` to render deep link. `BALE_BOT_USERNAME` read from env in `bale.service.ts`, must be set in both `api` and `bale-bot` docker-compose services.
- **`pendingDeepLink` persistence**: `authSlice.ts` stores `pendingDeepLink` in Redux, **persisted to localStorage** (removed from `Omit` exclusion, hydrated on load) so it survives Bale WebView kill/reload. `deepLinkPostId` computed via `useMemo` reading `startParam` directly from SDK (bypasses Redux timing race). `phone-otp-login-form.tsx` uses `redirectAfterAuth` (checks `pendingDeepLink`) instead of hardcoded `router.push('/dashboard')`.
- **Device management**: Per-device `tokenVersion` on `UserDevice` (not user-level) — deactivating one device doesn't invalidate others. Cap of 2 concurrent active devices; at 3rd device → dialog asks which to replace. `confirmDevice()` accepts optional `deviceToReplace` — deactivates only that device. `logout()` deactivates only current device.
- **CSP for Bale**: `frame-ancestors https://*.bale.ai`, Bale SDK sources in `scriptSrc`/`connectSrc`, `xFrameOptions: false`
- **CLOUDFLARE_API_TOKEN**: GitHub secret (not in .env.prod)

## Subscription Packages & Features

### Architecture
- **Features stored as JSON** (`features Json @default("{}")`) on `SubscriptionPackage` model — being replaced by `PackageFeatureConfig` model below
- 13 hardcoded features defined in a shared constant (NUMBER/BOOLEAN types) on both server and UI — redeploy needed to add new features
- Old columns `savedFiltersLimit`, `allowDiscountCodes`, `allowInviteCodes` and related `PackageFeature`/`PackageFeatureAssignment` tables removed

### Shared Constants
| File | Purpose |
| --- | --- |
| `server/src/modules/packages/package-features.constants.ts` | 12 feature definitions with type + default |
| `ui/src/components/admin/constants/package-features.constants.ts` | Mirror copy for frontend, exports `PackageFeatureKey` type and `defaultPackageFeatures()` |

### Feature Icon Mapping
- `ui/src/components/shared/package-feature-icons.tsx` — maps each `PackageFeatureKey` to a Lucide icon
- Exports `getPackageFeatureIcon(key)` — usable in admin, home cards, etc.

### Home Page Packages Section
- `ui/src/components/home/home-packages-section.tsx` — Swiper slider with Navigation arrows
  - Desktop: arrows positioned outside card area (left/right)
  - Mobile (`< md`): arrows shown beside the title
  - Fractional slides: `1.2` (mobile), `2` (tablet), `3.2` (desktop) — last card peeks to hint more content
- `ui/src/components/home/home-package-card.tsx` — card with logo+title, feature bullets with icons, price, Info dialog for description
  - `GET /user-panel/subscriptions/packages` is public (no JWT guard) so home page can fetch without auth

### Key Points
- `PackageDto` reads `features` from `entity.features` directly (runtime cast `Record<string, string>`)
- `SubscriptionsService` uses `featureBool()` helper to read boolean features from JSON
- `saved-filters.service.ts` reads `saved_filters_limit` from features JSON
- Admin form (`package-form.tsx`) renders capabilities from constant (not API query)
- Admin table (`admin-packages-manager.tsx`) shows individual feature columns with دارد/ندارد for booleans

### Feature Config Fields (Package Level)

Per-feature settings stored on `PackageFeatureConfig` (and immutably snapped on `PackageFeaturePriceSnapshot`):

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `extraUnitPrice` | Decimal? | null | Unit price charged when user exceeds limit (up to `maxExtra`). Enables **overage pricing** — usage-based charge beyond the included limit. |
| `allowRollover` | Boolean | false | Allows unused daily limit to accumulate to the next day. Only for DAILY-limit features. |
| `maxRolloverCap` | Int | 0 | Maximum rollover balance that can accumulate. Rollover is **burned** when the subscription ends. |
| `allowExtra` (existing) | Boolean | false | Whether extra (beyond limit) is allowed. |
| `maxExtra` (existing) | Int | 0 | Max number of extra units allowed at `extraUnitPrice` each. |

### Per-User Feature Overrides (`UserFeatureOverride`)

Allows admin to override specific feature limits for individual users, overriding their package's feature config. Model unique on `(userId, featureKey)`.

- **Backend**: `UsersController` adds `GET/PUT/DELETE /users/:userId/feature-overrides/:featureKey`
- **Service**: `server/src/modules/users/user-feature-override.service.ts`
- **Frontend**: `UserFeatureOverrideDialog` at `ui/src/components/admin/user-feature-override-dialog.tsx` — accessible via settings icon on each row in AdminUsersManager
- **Usage**: When checking limits, if a `UserFeatureOverride` exists for the user+featureKey, its `limitValue` takes precedence over the package config.

### UsageRollover Tracking

`UsageRollover` model (`userId + subscriptionId + featureKey` unique) tracks accumulated rollover balance per subscription. Data structure is ready; actual enforcement (daily reset, balance accumulation) is deferred to a future phase.

### Boolean Feature limitType Nullable

`FeatureBasePrice.limitType` changed from `String @default("OVERALL")` to `String?` (nullable). Boolean features (`allow_discount_codes`, `allow_invite_codes`) have `limitType = null`, skipping them from daily cost amortization in the pricing calculator.

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
- **Existing backend test suites (7 total)**:
  - `src/tests/unit/notifications-utils.spec.ts` — 8 pure utility functions (castDecimal, parsePayload, computeJitteredDelay, etc.)
  - `src/tests/unit/bale-message-builder.spec.ts` — 3 pure message builder functions (buildCaption, formatPriceLine, buildDashboardPostUrl)
  - `src/tests/unit/public.health.service.spec.ts` — Health check with retry/failure cache
  - `src/tests/unit/queue.service.spec.ts` — Queue service health
  - `src/tests/unit/sanitize.pipe.spec.ts` — Input sanitization pipe
  - `src/tests/integration/auth.service.integration.spec.ts` — Auth service (NestJS DI)
  - `src/tests/e2e/app.e2e-spec.ts` — Full app E2E (health, favicon)

## Arka Phone Fetch Flow (`arka-phone-fetch.service.ts`)

### Architecture
Replaced the old sequential brute-force approach (trying every integer ID from 383711 upwards via `POST /Search/FullDetails/Phone/{id}`). Now uses **search-based discovery**:

1. **Cron** (`@Cron(EVERY_5_MINUTES)`, gated by `ENABLE_ARKA_FETCH_CRON`): calls `fetchFromSearchPages(10)`
2. **Search**: `POST https://back.arkafile.info/Search/FullDetails` with `{page: N}` — returns 12 posts/page sorted by ID descending (newest first)
3. **For each post**: check `ArkaPhoneRecord` by `arkaId`:
   - No record → fetch phone from `POST /Search/FullDetails/Phone/{id}`, store
   - Phone = `09000000000` (dummy) → re-fetch and update
   - Phone = `null` → skip (already checked, no phone)
   - Has valid phone → skip
4. **Rate limiting**: 500ms between page requests, 250ms between phone detail requests

### CLI Backfill
- `npm run arka:fetch` — default 10 pages
- `MAX_PAGE=500 npm run arka:fetch` — large backfill (6000 posts)
- Reads `process.env['MAX_PAGE']` (default 10)

### API Endpoints
- `GET /admin/arka-sessions` — list sessions
- `POST /admin/arka-sessions` — create session (`headersRaw`, `label?`, `active?`, `locked?`)
- `PATCH /admin/arka-sessions/:id` — update session

### Prisma Models
| Model | Key Fields |
| --- | --- |
| `AdminArkaSession` | `headersRaw`, `headers` (JSON), `active`, `locked`, `lastError` |
| `ArkaPhoneCursor` | `nextFetchId`, `backoffUntil`, `lockedUntil` (legacy, kept for backward compat) |
| `ArkaPhoneRecord` | `arkaId` (unique), `externalId`, `phoneNumber`, `malkName`, `status`, `fetchedAt` |

### Old sequential fetch
The old `fetchNext()` / `fetchLatestArkaId()` / `releaseCursor()` methods remain in the code for backward compatibility but are no longer triggered by the cron scheduler.

## MelkRadar Phone Fetch Flow (`melkradar-phone-fetch.service.ts`)

### Architecture
Same pattern as Arka but simpler — MelkRadar's listing API returns phone numbers directly, no second fetch needed:

1. **Manual script** (`melkradar:phone-fetch`): calls `fetchFromListingPages(maxPages)`
2. **Listing**: `POST https://realtorpanel.melkradar.com/odata/ClientApp/realtorEstateMarker/getRealtorEstateMarkers` with `{PageSize: 20, PageNumber: N}` — phone numbers in `ContactPhone` field
3. **For each item**: check `MelkradarPhoneRecord` by `melkradarId`:
   - No record → store directly with phone, externalId, radarCode, full payload
   - Already has phone → skip
4. **Rate limiting**: 200ms between page requests, 100ms between store operations
5. **Auth**: Uses `AdminMelkradarSessionsService.getActiveSession()` (Cookie-based auth)

### CLI Commands
- `npm run melkradar:phone-fetch` — default 10 pages
- `MAX_PAGE=500 npm run melkradar:phone-fetch` — large backfill
- `npm run melkradar:phone-transfer` — transfer phones to DivarPost

### API Endpoints (existing)
- `GET /admin/melkradar-sessions` — list sessions
- `POST /admin/melkradar-sessions` — create session (`headersRaw`, `label?`, `active?`, `locked?`)
- `PATCH /admin/melkradar-sessions/:id` — update session

### Prisma Models
| Model | Key Fields |
| --- | --- |
| `AdminMelkradarSession` | `headersRaw`, `headers` (JSON), `active`, `locked`, `lastError` |
| `MelkradarPhoneRecord` | `melkradarId` (unique), `externalId`, `phoneNumber`, `radarCode`, `payload`, `status`, `fetchedAt` |

### Key differences from Arka
| Aspect | Arka | MelkRadar |
| --- | --- | --- |
| Auth header | `Authorization: Bearer` | `Cookie: access_token=...` |
| Fetch steps | 1) Search page 2) Phone detail (second call) | 1) Listing page (phone included) |
| Model unique key | `arkaId` (int) | `melkradarId` (string UUID) |
| Cron | `EVERY_5_MINUTES` | None (manual only) |

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
