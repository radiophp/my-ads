# Agent Notes

This repository hosts the **My Ads** NestJS backend (`server/`). Key operational details for future automation or contributing agents:

- **Environment management**
  - `.env` lives in the repository root. Local commands inside `/server` rely on `dotenv-cli` to load `../.env`.
  - Runtime configuration is validated in `src/platform/config/environment.validation.ts`; the README includes a full variable table.
  - Swarm Postgres uses `POSTGRES_MAX_CONNECTIONS` (see `docker-compose-prod.yml`) to raise `max_connections`.

- **Tooling & commands**
  - Install dependencies from `/server` with `npm install`; Husky hooks are enabled via `npm run prepare`.
  - Linting requires the legacy config flag: `cd server && ESLINT_USE_FLAT_CONFIG=false npm run lint`.
  - Unit/integration/e2e tests: `npm test --prefix server -- --runInBand --bail --passWithNoTests`.
  - Prisma client generation: `npm run prisma:generate` (env must be configured first).
- **Divar posts filtering**
  - The UI persists the category filter as `searchFilter.categorySelection` (an object with `slug`/`depth`). Always dispatch `setCategorySelection({ slug, depth })` so the dashboard rail and API params stay in sync.
  - Location filters cascade: `provinceId` → `citySelection` (multi-select) → `districtSelection` (enabled whenever at least one city is selected; multi-city mode prefixes district labels with the city name). Province changes reset both cities and districts; changing city selections resets districts as well.
  - `/divar-posts` accepts `categorySlug`, `categoryDepth`, and optional `districtIds`. The service maps categories to `cat1`/`cat2`/`cat3` (or the canonical slug) and filters `districtId` when provided. Every call logs the Prisma `where` clause, cursor, and limit—search for `DivarPosts query -> ...` before assuming “no data”.
  - For the full widget DSL that powers per-category filters, see `docs/category-filters.md`.

- **Husky pre-commit hook**
  - Runs `lint-staged`, `npm run typecheck`, and targeted Jest tests. Expect hook failures if ESLint or tests fail; fix and re-stage.

- **Redis rate limiting**
  - `RateLimitService` now prefers a Lua script via `RedisService.eval`. During tests, in-memory Redis stubs omit `eval`, so the service falls back to the classic `INCR`/`EXPIRE` sequence—ensure mocks expose the methods you depend on.

- **Observability**
  - Prometheus lives at `/metrics`; health metrics include dependency gauges and latencies.
  - OpenTelemetry tracing is optional (`OTEL_ENABLED`). Disabling leaves bootstrap silent without throwing.
  - Grafana is fronted by Caddy at `https://monitoring.mahanfile.com`; admin creds come from GitHub secrets/vars (`GRAFANA_ADMIN_*`). Datasources: Prometheus, Loki, Tempo. Provisioned dashboards live in `observability/grafana/provisioning/dashboards/`:
    - `service-health` (dependency timeline)
    - `api-observability` (RPS, latency, errors, top paths, dependency gauge)
    - `logs-overview` (log volume/error rate per `compose_service`, OTP failures, live stream)
  - News crawlers (Eghtesad/Khabaronline/Asriran) run on cron every 15 minutes when enabled; one-off scripts exist under `npm run news:crawl:*`.

- **WebSockets & queues**
  - Socket.IO is backed by Redis scoped clients. Queue consumers use RabbitMQ with a helper (`register-consumer-with-retry.util.ts`) for resilient registration.

- **Push notifications (PWA)**
  - The UI ships `ui/public/service-worker.js` so `/service-worker.js` always exists in production; it imports `ui/public/push-sw.js` for push/click handlers.
  - `ui/src/app/layout.tsx` captures `beforeinstallprompt` into `window.__pwaPromptEvent` and emits `pwa:installable`; `usePwaPrompt` listens to those events.
  - Standalone splash uses `data-pwa-splash` + `#pwa-splash` (see `ui/src/app/layout.tsx` + `ui/src/app/globals.css`) and renders `/logo-mahan-file.png`.
  - `PwaBackNavigation` traps the first back action on deep links in standalone mode and routes to `/` instead of closing the app.
  - Required envs: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `PUSH_NOTIFICATION_TIMEOUT_MS`. `NOTIFICATION_PUSH_ALWAYS` controls whether push is attempted even when websocket delivery succeeds.

- **Dashboard/UI context**
  - The Next.js dashboard now hydrates auth in a `useLayoutEffect` and wraps RTK Query base calls with automatic token refresh. Any work touching auth must keep `setAuth`/`clearAuth` semantics intact or requests will loop on 401.
  - Divar cards rely on the iconised overlay badges (business type, publish time, media count). When editing cards, preserve the `pointer-events-none` wrappers so clicking still opens the modal.
  - News is public-facing: list and detail pages live in `ui/src/app/news` and use SSR with `revalidate = 300`. Admin CRUD routes are under `/admin/news`, `/admin/news/categories`, and `/admin/news/tags`, backed by `server/src/modules/news`.
  - Blog is public-facing: list and detail pages live in `ui/src/app/blog` and use SSR with `revalidate = 300`. Admin CRUD routes are under `/admin/blog`, `/admin/blog/categories`, and `/admin/blog/tags`, backed by `server/src/modules/blog`.
  - Site/SEO settings live under `/admin/website-settings` and `/admin/seo` (public pages hydrate from cached settings).
  - The login page is `/login`; use the shared login form component for modal login prompts.
  - Mobile uses a fixed bottom navigation and hides the top header on small screens; keep the `pb-[calc(4rem+env(safe-area-inset-bottom))]` padding in layout so content does not collide with the nav.
  - Toasts cap at 3 visible items and support swipe-to-dismiss (see `ui/src/components/ui/toast.tsx` + `ui/src/components/ui/use-toast.ts`).

Keep outputs ASCII-only when editing files, prefer `apply_patch`, and avoid destructive git commands. Refer to `README.md` for a full architecture and environment overview.
