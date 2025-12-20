# Repository Guidelines

## Project Structure & Module Organization
- `server/src/app.module.ts` wires configuration, shared providers, and feature modules.
- `server/src/modules/*` hosts domain logic (auth, users, panels, uploads) and should export focused Nest modules with explicit providers.
- `server/src/common` and `server/src/platform` centralize guards, filters, logging, queues, storage, and telemetry helpers.
- Tests live in `server/src/tests/{unit,integration,e2e}` with fixtures under `server/src/tests/setup-test.ts`; avoid creating top-level `test/` directories.
- Root-level assets include `docker-compose.yml`, `observability/` dashboards, `rabbitmq/` seed scripts, and the Prisma schema in `server/prisma`.

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
