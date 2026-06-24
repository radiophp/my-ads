# Recent Changes

Compact log of notable changes, grouped by theme with commit references.

---

## 2026-06-24 — Feature-based pricing infrastructure (Phase A)

**Overview:** Adds `FeatureBasePrice`, `PackageFeatureConfig`, `PackageFeaturePriceSnapshot` models and admin UI for inline price editing.

**Backend:**
- Prisma models: `FeatureBasePrice` (with `FeaturePricingType` enum, `limitType` DAILY/OVERALL), `PackageFeatureConfig`, `PackageFeaturePriceSnapshot`
- 7 migrations: base models, Persian label fixes, type changes, `limitType` column
- `FeatureBasePriceService` — CRUD + `seedFromConstants` (12 features + archive_history_quarters)
- `FeaturePricingService` — `calculatePackagePricing` (DAILY vs OVERALL amortization), `generateSnapshots`
- `packages.service.ts` updated — accepts `featureConfigs` on create/update, auto-converts features JSON, auto-generates snapshots
- `admin-panel.service.ts` — stats include `featureBasePrices` count

**Frontend:**
- `admin-feature-base-prices-manager.tsx` — table with search, inline price editing
- Input group: input + "ریال" label + ذخیره button share one border
- `PriceHint` component shows Persian word price below input (e.g., "پنج هزار تومان")
- Enter key saves, number delimiter (comma formatting)
- Active/deactivate switch right-aligned (LTR direction)
- Right-aligned headers, breadcrumb translation
- `package-features.constants.ts` — 13 features, `limitType` per feature
- `package-feature-icons.tsx` — added `archive_history_quarters` → History icon

**Key decisions:**
- FeatureBasePrice stores reference prices; snapshots immutable per package
- OVERALL features amortized: `dailyTotal = (unitPrice × limitValue) / durationDays`
- Changing FeatureBasePrice never affects existing packages

---

## 2026-06-13 — Bale botId for multi-environment safety

**Commit:** `cf99a00`

**Problem:** Restoring a DB across environments (dev ↔ prod) with different Bale bot tokens produces stale `BaleUserLink` records — the wrong bot tries sending OTPs to invalid `chatId`s.

**Solution:** Store `botId` (numeric token prefix) in every `BaleUserLink` record and filter by it.

**Files:**
- `server/prisma/schema.prisma` — `botId String` + index on `BaleUserLink`
- `server/prisma/migrations/20260613003052_add_bale_bot_id/` — add column with `DEFAULT ''`
- `server/prisma/migrations/20260613003210_add_bale_bot_id/` — drop default
- `server/src/modules/bale/bale.service.ts` — `getBotId()` helper; `saveBaleLink()` stores `botId`; `findChatLink()` filters by it
- `server/src/modules/auth/auth.service.ts` — `findBaleLinkByPhone()` filters by `botId`, returns `null` if no token
- `docker-compose-prod.yml` — added `BALE_BOT_TOKEN` + `BALE_BOT_AUTOSTART=false` to `api` service

**Deployment:**
- Manual SQL added column on production (identical to migration)
- `_prisma_migrations` table updated via `prisma migrate resolve --applied` (or direct SQL)
- Force-updated `api` and `bale-bot` services via `docker service update --force`

---

## 2026-06-12 — Bale multi-account linking validation

**Commit:** `5959b57`

**Problem:** Users could link multiple Bale accounts to the same phone, causing confusion on which bot sends OTPs/posts.

**Solution:** Token-based phone matching — `findBaleLinkByPhone()` matches the current bot token against the stored link, preventing old/stale links from matching.

---

## 2026-06-11/12 — Cloudflare Turnstile human verification

**Commits:** `5adacfc` → `25371d3` (8 commits)

**Overview:** Adds Cloudflare Turnstile (invisible challenge) to the login flow, gated by an admin toggle.

**Key changes:**
- **Backend:** `auth.service.ts` guards `request-otp` with Turnstile token verification when `ENABLE_TURNSTILE=true`. Fetch failures are caught gracefully (no 500). `TURNSTILE_SECRET_KEY` added to env validation.
- **UI:** Turnstile widget loaded on login page. Button disabled until widget loads. Persian language + system dark/light theme sync. Phone input preserves leading `0` visually, strips on submit.
- **Admin:** Toggle `enableTurnstile` in website settings to turn verification on/off.
- **CI/compose:** `TURNSTILE_SECRET_KEY` in GitHub secrets; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` added to UI service env in `docker-compose-prod.yml`.

**Env vars added:**
- `TURNSTILE_SECRET_KEY` (server, secret)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (UI, public)
- `ENABLE_TURNSTILE` (admin settings)

---

## 2026-06-10 — Login OTP improvements

**Commits:** `1f8e2ca`, `b190c2e`, `9e8bd36`, `fc10f7e`, `7e776f5`

**Changes:**
- **Bale OTP button** added to login page — users can request OTP via Bale messenger instead of SMS
- **Auto-submit** OTP code when all digits entered
- **Bale OTP fallback** — if Bale send fails, fall back to SMS/console OTP
- **Form spacing** increased, phone description hidden on verify step
- **Phone input** leading zero preserved visually, stripped on form submit
- **Login hero** removed (cleaner layout)
- **Postgres settings** synced in docker-compose-prod.yml

---

## 2026-06-09 — Cursor pagination overhaul

**Commits:** `beb40cb` → `3fc791e` (6 commits)

**Problem:** Prisma's `cursor`/`skip` with `take` caused full-table scans on 600K+ `DivarPost` rows whenever the cursor column had many ties (same `publishedAt`). Scroll-based dashboard pagination became unusably slow.

**Solution:** Replace Prisma cursor with manual `WHERE (publishedAt, createdAt, id) < (cursor...)` tuple comparisons across the board.

**Key changes:**
- `divar-posts.service.ts` — manual tuple cursor using `RawQueryParams` helper (`runQuery`/`buildWhereClause`)
- `DivarPost_provinceId_publishedAt_idx` — new composite index for province-only queries
- Multi-city queries split into per-city `UNION ALL` to leverage composite indexes
- `PostToReadQueue_status_requestedAt_idx` — index for fetch service (prevents seq scans)

**Post-restore SQL (composite indexes):**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_cityId_publishedAt_idx"
  ON "DivarPost" ("provinceId", "cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_cityId_publishedAt_idx"
  ON "DivarPost" ("cityId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DivarPost_provinceId_publishedAt_idx"
  ON "DivarPost" ("provinceId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
```

---

## 2026-06-08 — CI/CD pipeline changes

**Commits:** `aae4555`, `5451d27`

- **bale-bot force-update** added to deploy step (`docker service update --force`)
- **Turnstile secret key** — fixed duplicate key in CI workflow
- Memory: deployment on WSL self-hosted runner uses `--resolve-image never`; migration via `docker run --network`
