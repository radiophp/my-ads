# Repository Guidelines

## Project Structure & Module Organization
- `server/src/app.module.ts` wires configuration, shared providers, and feature modules.
- `server/src/modules/*` hosts domain logic (auth, users, panels, uploads) and should export focused Nest modules with explicit providers.
- `server/src/modules/news` owns news categories/tags plus public list/detail endpoints and admin CRUD.
- `server/src/common` and `server/src/platform` centralize guards, filters, logging, queues, storage, and telemetry helpers.
- Tests live in `server/src/tests/{unit,integration,e2e}` with fixtures under `server/src/tests/setup-test.ts`; avoid creating top-level `test/` directories.
- Root-level assets include `docker-compose.yml`, `observability/` dashboards, `rabbitmq/` seed scripts, and the Prisma schema in `server/prisma`.
 - Public news pages live in `ui/src/app/news` (SSR, `revalidate = 300`) and are linked in the header nav.

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
- Map tiles: TileServer-GL service added (dev port `${MAP_TILES_PORT:-7235}`, prod `${MAP_TILES_PORT:-8235}`) expecting `maps/iran.mbtiles` or `${MAP_TILES_PATH:-/var/lib/my-ads/maps}/iran.mbtiles`.
  - Fetch prebuilt tiles: `MBTILES_URL=... ./scripts/sync-tiles.sh` (honors `MAP_TILES_PATH`). Use in CI before compose/stack deploy.
  - Build Iran locally (full labels): `OMT_POSTGRES_PORT=<free_port> MIN_ZOOM=0 MAX_ZOOM=14 ./scripts/build-iran-tiles.sh` (long-running). Restart tileserver after build.
  - Default UI uses same-origin tiles: `NEXT_PUBLIC_MAP_TILE_BASE_URL=/map` -> `/map/styles/basic-preview/style.json` and `/map/styles/basic-preview/{z}/{x}/{y}.(pbf|png)`. If switching to dedicated map domains, update env + Caddy accordingly and proxy `/map`, `/data`, `/fonts` to the tileserver.
- DB backup/restore: dev Postgres on `6201` (`postgres/postgres`); prod published `6301` -> internal `5432` (`mahan_admin/zQ5gG7k3S9nK2bFw`). Backup example: `PGPASSWORD=postgres pg_dump -Fc -h host.docker.internal -p 6201 -U postgres -d my_ads -f /tmp/dev-backup.dump`. Restore to prod: `PGPASSWORD=zQ5gG7k3S9nK2bFw pg_restore --clean --if-exists --no-owner --no-acl -h host.docker.internal -p 6301 -U mahan_admin -d mahan_file /tmp/dev-backup.dump`. Keep compose target port 5432 and published port 6301 aligned.

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
