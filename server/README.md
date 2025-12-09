# My Ads Backend

A modern NestJS (Fastify) backend ready for production workloads. It ships with PostgreSQL via Prisma, Redis-backed caching, BullMQ queues, Prometheus metrics, JWT authentication with role-based access, WebSocket support, and a Docker-first delivery model.

## Features

- **NestJS + Fastify** with global validation, sanitisation, security hardening, and Prometheus metrics interceptor.
- **Prisma ORM** targeting PostgreSQL with ready-to-run schema and migration tooling.
- **Redis integration** (Redis Stack) for caching, rate limiting, job queues, and WebSocket clustering.
- **Runtime env validation** powered by class-validator, failing fast on misconfiguration.
- **Authentication** using JWT access and refresh tokens, role guards (`USER`, `ADMIN`), and rate-limited public endpoints.
- **BullMQ queues** with sample email and notification processors and Redis-backed queue scheduler.
- **Socket.IO Gateway** configured for Redis adapter to scale horizontally (`/ws` namespace).
- **Prometheus metrics** exposed at `/metrics`, recording HTTP latency histograms and useful counters.
- **Testing setup** featuring Jest unit, integration, and e2e tests (Fastify + Supertest).
- **CI/CD template** via GitHub Actions running Prisma generation and the full test suite.
- **Container ready**: multi-stage Dockerfile and docker-compose definition for local orchestration.

## Getting Started

### 1. Environment configuration

Copy the sample environment file located in the repository root and adjust values for your setup:

```bash
cp ../.env.example ../.env   # run from /server
# or from repo root: cp .env.example .env
```

The defaults are geared towards Docker Compose (PostgreSQL + Redis service names). For local development without containers, change `DATABASE_URL` and `REDIS_HOST` to point to your own instances (e.g., `localhost`).

### 2. Install dependencies

```bash
npm install
npm run prepare # sets up Husky git hooks
npm run prisma:generate
```

### 3. Apply database migrations

```bash
npm run prisma:migrate -- --name init
```

### 4. Run the application

```bash
npm run start:dev
```

The API will be available at `http://localhost:6200/api` and health checks at `http://localhost:6200/public/health`.

## Docker Compose

To boot the full stack (API + PostgreSQL + Redis) using containers:

```bash
docker-compose up --build
```

Run the command from the repository root; it mounts `./server` into the container for hot-reloading (`npm run start:dev`).

Default port bindings:

- API → `6200`
- PostgreSQL → `6201`
- Redis Stack → `6202`
- Redis Stack Insight UI → `6203`

## Testing

```bash
npm test          # Unit + integration tests
npm run test:e2e  # Fastify e2e tests (stubbed Prisma/Redis)
```

## Useful Scripts

- `npm run prisma:generate` – generate Prisma Client.
- `npm run prisma:migrate` – run interactive migrations.
- `npm run prisma:studio` – launch Prisma Studio UI.
- `npm run build` – compile to `dist/`.
- `npm run start:prod` – run compiled output.
- `npm run typecheck` – run the TypeScript compiler in no-emit mode.

## Project Structure

```
/server
  ├── src/
  │   ├── main.ts                 # Fastify bootstrap
  │   ├── app.module.ts           # Root module wiring
  │   ├── config/                 # Centralised configuration loaders
  │   ├── common/                 # Decorators, guards, pipes, filters
  │   ├── database/               # Prisma service + module
  │   ├── cache/                  # Redis + cache-manager setup
  │   ├── auth/                   # Auth controllers, DTOs, guards, strategies
  │   ├── users/                  # User services/controllers/DTOs
  │   ├── public/                 # Public unauthenticated endpoints
  │   ├── user-panel/             # Authenticated user endpoints
  │   ├── admin-panel/            # Admin-only endpoints
  │   ├── queue/                  # BullMQ integrations
  │   ├── websocket/              # Socket.IO gateway + Redis adapter
  │   ├── metrics/                # Prometheus module and interceptor
  │   └── tests/                  # Jest test suites (unit, integration, e2e)
  ├── prisma/schema.prisma        # Data model
  ├── docker-compose.yml          # Local orchestration
  ├── Dockerfile                  # Multi-stage production image
  ├── jest.config.js              # Jest base configuration
  ├── .github/workflows/ci.yml    # GitHub Actions pipeline
  └── README.md                   # This guide
```

## Prometheus Metrics

Hit `GET /metrics` for a Prometheus-compatible exposition format. The default setup includes:

- `http_server_request_duration_seconds` histogram with method/path/status labels.
- `users_created_total` counter incremented whenever a new user is registered.

## Queues & WebSockets

- `EmailProcessor` handles transactional emails, while the notifications module uses RabbitMQ + Socket.IO to push saved-filter matches to online users with automatic retries.
- The Socket.IO gateway lives on `/ws` and publishes Redis-backed events, making it safe for multi-instance deployments.

## Roadmap

- GraphQL module scaffolding when required.
- Additional queue processors (emails, push notifications).
- Production-grade observability (structured logging, tracing).

## License

MIT
