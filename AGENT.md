# Agent Notes

This repository hosts the **My Ads** NestJS backend (`server/`). Key operational details for future automation or contributing agents:

- **Environment management**
  - `.env` lives in the repository root. Local commands inside `/server` rely on `dotenv-cli` to load `../.env`.
  - Runtime configuration is validated in `src/platform/config/environment.validation.ts`; the README includes a full variable table.

- **Tooling & commands**
  - Install dependencies from `/server` with `npm install`; Husky hooks are enabled via `npm run prepare`.
  - Linting requires the legacy config flag: `cd server && ESLINT_USE_FLAT_CONFIG=false npm run lint`.
  - Unit/integration/e2e tests: `npm test --prefix server -- --runInBand --bail --passWithNoTests`.
  - Prisma client generation: `npm run prisma:generate` (env must be configured first).
- **Divar posts filtering**
  - The UI persists the category filter as `searchFilter.categorySelection` (an object with `slug`/`depth`). Always dispatch `setCategorySelection({ slug, depth })` so the dashboard rail and API params stay in sync.
  - `/divar-posts` accepts `categorySlug` and `categoryDepth`. The service maps them to `cat1`/`cat2`/`cat3` or `categorySlug` and logs the generated Prisma `where` clause, cursor, and limit for debugging. Look for `DivarPosts query -> ...` in Nest logs before assuming “no data”.

- **Husky pre-commit hook**
  - Runs `lint-staged`, `npm run typecheck`, and targeted Jest tests. Expect hook failures if ESLint or tests fail; fix and re-stage.

- **Redis rate limiting**
  - `RateLimitService` now prefers a Lua script via `RedisService.eval`. During tests, in-memory Redis stubs omit `eval`, so the service falls back to the classic `INCR`/`EXPIRE` sequence—ensure mocks expose the methods you depend on.

- **Observability**
  - Prometheus lives at `/metrics`; health metrics include dependency gauges and latencies.
  - OpenTelemetry tracing is optional (`OTEL_ENABLED`). Disabling leaves bootstrap silent without throwing.

- **WebSockets & queues**
  - Socket.IO is backed by Redis scoped clients. Queue consumers use RabbitMQ with a helper (`register-consumer-with-retry.util.ts`) for resilient registration.

- **Dashboard/UI context**
  - The Next.js dashboard now hydrates auth in a `useLayoutEffect` and wraps RTK Query base calls with automatic token refresh. Any work touching auth must keep `setAuth`/`clearAuth` semantics intact or requests will loop on 401.
  - Divar cards rely on the iconised overlay badges (business type, publish time, media count). When editing cards, preserve the `pointer-events-none` wrappers so clicking still opens the modal.

Keep outputs ASCII-only when editing files, prefer `apply_patch`, and avoid destructive git commands. Refer to `README.md` for a full architecture and environment overview.
