# Divar Post Crawler Pipeline

## Overview

The Divar crawler pipeline converts raw listings from Divar.ir into structured `DivarPost` records in the database. It runs as **5 sequential stages**, each with its own queue table, service, and cron schedule:

```
[Divar API]
    │
    ▼ Stage 1: HARVEST  ── divar:harvest-posts ──→ PostToReadQueue (PENDING)
    │
    ▼ Stage 2: FETCH    ── divar:fetch-posts   ──→ PostToAnalyzeQueue (PENDING)
    │
    ▼ Stage 3: ANALYZE  ── divar:analyze-posts ──→ DivarPost (the final table)
    │
    ▼ Stage 4: MEDIA SYNC ── divar:sync-media  ──→ MinIO local storage
    │
    ▼ Stage 5: CONTACT FETCH (on-demand / API-triggered)
```

Each script bootstraps a NestJS application context, resolves the corresponding service, and triggers a single run. The same services are also activated via `@Cron()` decorators when `ENABLE_CRON_JOBS=true`.

---

## Stage 1: Harvest (`divar:harvest-posts`)

**Script:** `server/src/scripts/run-divar-post-harvest.ts`
**Service:** `DivarPostHarvestService` (`server/src/modules/divar-posts/divar-post-harvest.service.ts`)

### What it does

1. Queries **categories** where `DivarCategory.allowPosting=true` and `isActive=true`
2. Queries **locations** (`Province` + `City`) where `allowPosting=true`
3. For every **(category × location)** combination:
   - Builds a search request body with pagination
   - Calls `POST https://api.divar.ir/v8/postlist/w/search`
   - Extracts `POST_ROW` widgets (each contains a `token`)
   - Deduplicates within the page
   - Checks `PostToReadQueue` for existing tokens:
     - If token exists and was **last fetched within** `DIVAR_REFETCH_WINDOW_MINUTES` (default 4h) → skip
     - If token exists but is **stale** → reactivate (reset status to PENDING)
     - If token is **new** → insert into queue
   - Writes new rows to `PostToReadQueue` with:
     - `source: "DIVAR"`, `externalId: <token>`
     - `categoryId`, `categorySlug`
     - `locationScope` (CITY | PROVINCE), `provinceId`, `cityId`
     - `status: PENDING`

### Queue Table

```prisma
model PostToReadQueue {
  id            String          @id @default(uuid())
  source        String          @default("DIVAR")       // discriminator for multi-source
  externalId    String                                  // Divar token
  categoryId    String?
  categorySlug  String
  locationScope QueueLocationScope                      // CITY | PROVINCE
  provinceId    Int?
  cityId        Int?
  payload       Json?                                   // raw widget data from search
  status        PostQueueStatus  @default(PENDING)      // PENDING | PROCESSING | COMPLETED | FAILED
  fetchAttempts Int              @default(0)
  lastFetchedAt DateTime?
  requestedAt   DateTime         @default(now())
  @@unique([source, externalId])
}
```

### Key Config

| Env | Default | Description |
|---|---|---|
| `DIVAR_SESSION_COOKIE` | — | Optional auth cookie |
| `DIVAR_HARVEST_MAX_PAGES` | 20 | Max pages per combo (0 = unlimited) |
| `DIVAR_HARVEST_MAX_PAGES_NIGHT` | 5 | Max pages during night window |
| `DIVAR_HARVEST_NIGHT_START_HOUR` | — | Night window start (Tehran time) |
| `DIVAR_HARVEST_NIGHT_END_HOUR` | — | Night window end |
| `DIVAR_HARVEST_DELAY_MS` | 750 | Delay between pages |
| `DIVAR_HARVEST_TIMEOUT_MS` | 15000 | HTTP request timeout |
| `DIVAR_REFETCH_WINDOW_MINUTES` | 240 | Min age before re-fetching a post |

---

## Stage 2: Fetch (`divar:fetch-posts`)

**Script:** `server/src/scripts/run-divar-post-fetch.ts`
**Service:** `DivarPostFetchService` (`server/src/modules/divar-posts/divar-post-fetch.service.ts`)

### What it does

1. Releases stuck jobs: marks `PROCESSING` records older than 1 minute back to `PENDING`
2. Reserves a batch of `PENDING` records (default batch size: 3) in a transaction — marks them `PROCESSING`
3. For each reserved token:
   - Calls `GET https://api.divar.ir/v8/posts-v2/web/{token}` with rotating User-Agent headers
   - On success:
     - Marks `PostToReadQueue` as `COMPLETED` with `lastFetchedAt=now()`
     - Upserts into `PostToAnalyzeQueue` with:
       - `source: "DIVAR"`, `externalId: <token>`
       - `readQueueId` linking back to the harvest record
       - `payload: <raw JSON from Divar detail API>`
       - `status: PENDING`
   - On failure:
     - Increments `fetchAttempts`, sets `FAILED` after 5 attempts
     - Respects `Retry-After` header on 429 (rate limit)
4. Processes the batch in parallel (configurable via `DIVAR_POST_FETCH_BATCH_SIZE`)

### Queue Table

```prisma
model PostToAnalyzeQueue {
  id           String             @id @default(uuid())
  source       String             @default("DIVAR")
  externalId   String
  readQueueId  String             @unique              // FK → PostToReadQueue
  payload      Json                                    // RAW JSON from Divar detail API
  status       PostAnalysisStatus @default(PENDING)    // PENDING | PROCESSING | COMPLETED | FAILED
  retryCount   Int                @default(0)
  @@unique([source, externalId])
}
```

### Key Config

| Env | Default | Description |
|---|---|---|
| `DIVAR_POST_FETCH_BATCH_SIZE` | 3 | Parallel batch size |
| `DIVAR_POST_FETCH_TIMEOUT_MS` | 15000 | HTTP request timeout |

---

## Stage 3: Analyze / Parse (`divar:analyze-posts`) — **The Transformation Layer**

**Script:** `server/src/scripts/run-divar-post-analyze.ts`
**Service:** `DivarPostAnalyzeService` + `DivarPostParser` (`server/src/modules/divar-posts/divar-post-analyze.service.ts`, `divar-post-parser.ts`)

This is the **core transformation engine**. It converts Divar's protobuf-style widget payload into a normalized `ParsedDivarPost` and persists it to the `DivarPost` table.

### Flow

1. Reads pending jobs from `PostToAnalyzeQueue` (batch of 100 by default)
2. Chunks them into groups of 50 with 1s rate limiting between chunks
3. For each job, calls `DivarPostParser.parse(rawPayload)` → `ParsedDivarPost`
4. Persists via `persistParsedPost()` inside a Prisma transaction

### The Parser (`DivarPostParser`)

The parser walks the raw JSON payload and extracts data from these top-level keys:

| Payload Key | Extracted Fields |
|---|---|
| `seo` | `title`, `description`, `seoTitle`, `seoDescription`, `expiresAt`, `latitude`/`longitude` (from `post_seo_schema.geo`), `area` (from `floorSize`) |
| `share` | `shareTitle`, `shareUrl` |
| `contact` | `contactUuid` |
| `analytics` | `cat1`, `cat2`, `cat3` (category hierarchy slugs), `citySlug` |
| `city` | `cityId`, `provinceId`, `cityName`, `citySlug` |
| `webengage` | `priceTotal`, `depositAmount`, `rentAmount`, `imageCount`, `businessType`, `citySlug`, `districtSlug`, `cat1`/`cat2`/`cat3` |
| `sections[].widgets[]` | See widget mapping below |
| `addon_service_tags` | Extra service attributes |

### Widget Type → ParsedDivarPost Mapping

The `sections` array contains widgets. Each widget has a `data.@type` discriminator:

| Widget Type (`@type`) | Data Fields Extracted |
|---|---|
| `GroupInfoRow` | `area`/`areaLabel` (from "متراژ"), `rooms`/`roomsLabel` (from "اتاق"), `yearBuilt`/`yearBuiltLabel` (from "ساخت"). Other items stored as attributes. |
| `UnexpandableRowData` | `priceTotal` ("قیمت کل"), `pricePerSquare` ("قیمت هر متر"), `depositAmount` ("ودیعه"), `rentAmount` ("اجارهٔ ماهانه"), `floor`/`floorLabel` ("طبقه"), `landArea` ("متراژ زمین"), `capacity` ("ظرفیت"), `floorsCount` ("تعداد طبقات"), `unitPerFloor` ("تعداد واحد در هر طبقه"), `photosVerified`, `conversionType`, `dailyRate*` (روزهای عادی/آخر هفته/تعطیلات), `extraPersonFee`. Non-primary items stored as attributes. |
| `GroupFeatureRow` | `hasParking`, `hasElevator`, `hasWarehouse`, `hasBalcony` boolean flags. Other features stored as attribute with `type: 'feature'`. |
| `LegendTitleRowData` | `displayTitle`, `displaySubtitle` — subtitle is parsed for **relative publish time** (e.g., "۲ ساعت پیش در دیوار") → `relativePublishMs` |
| `DescriptionRowData` | `description` |
| `ImageCarouselData` | `medias[]` — each entry has `url`, `thumbnailUrl`, `alt`, `position` |
| `MapRowData` | `latitude`, `longitude` (from `location.exact_data.point` or `location.approx_data.point`) |
| `FeatureRowData` | Stored as attribute with `type: 'feature'` |

### Universal Intermediate Representation (`ParsedDivarPost`)

```typescript
interface ParsedDivarPost {
  // Identity
  title, seoTitle, displayTitle, displaySubtitle, description, seoDescription
  shareTitle, shareUrl, permalink
  contactUuid, businessType, conversionType

  // Category hierarchy
  cat1, cat2, cat3

  // Location
  provinceId, provinceName
  cityId, citySlug, cityName
  districtSlug, districtName

  // Pricing (all number | null)
  priceTotal, pricePerSquare, depositAmount, rentAmount
  dailyRateNormal, dailyRateWeekend, dailyRateHoliday, extraPersonFee

  // Property specs
  area, areaLabel
  landArea, landAreaLabel
  rooms, roomsLabel
  floor, floorLabel, floorsCount, unitPerFloor
  yearBuilt, yearBuiltLabel
  capacity, capacityLabel

  // Feature flags
  hasParking, hasElevator, hasWarehouse, hasBalcony
  isRebuilt, photosVerified, imageCount

  // Geo
  latitude, longitude

  // Timestamps
  expiresAt, publishedAtJalali, jalaliGregorianDate
  relativePublishMs, relativePublishText

  // Related data
  medias: ParsedMedia[]        // { url, thumbnailUrl, alt, position }
  attributes: ParsedAttribute[] // { key, label, type, stringValue, numberValue, boolValue, unit, rawValue }
}
```

### Persian Text Normalization Utilities

The parser includes robust Persian text handling:

- **`replacePersianDigits()`** — Converts Arabic/Persian numerals (۰-۹, ٠-٩) to Latin
- **`normalizePersianWord()`** — Normalizes ی/ي, ک/ك, ۀ/ه variations
- **`parseNumberFromText()`** — Strips commas, Persian/Arabic separators, extracts first number
- **`parseRelativeSubtitle()`** — Parses Persian relative time expressions like "۲ ساعت پیش" → milliseconds
- **`extractJalaliDateComponents()`** — Parses SEO title for Jalali date (e.g., "آپارتمان ... ۱۵ فروردین ۱۴۰۴") → Gregorian Date
- **`parseRoomsCount()`** — Maps Persian room words (یک=1, دو=2, بدون اتاق=0, etc.)
- **`parseFloorValue()`** — Handles "همکف" → 0, "زیرهمکف" → -1

### Persistence (`persistParsedPost`)

In `divar-post-analyze.service.ts:153-287`:

1. Resolves `districtId` from `districtSlug` via DB lookup (with in-memory cache)
2. Resolves `publishedAt`:
   - If `relativePublishMs < 24h` → `baseTimestamp - relativePublishMs`
   - Otherwise → same formula (handles older posts)
   - Falls back to Jalali→Gregorian conversion
3. Runs a Prisma transaction:
   - `divarPost.upsert` where `readQueueId` is the unique key — maps all 50+ fields from `ParsedDivarPost`
   - Deletes old `DivarPostMedia` + `createMany` new ones
   - Deletes old `DivarPostAttribute` + `createMany` new ones
   - Marks `PostToAnalyzeQueue` → `COMPLETED`

### The Final Table (`DivarPost`)

```prisma
model DivarPost {
  id              String   @id @default(uuid())
  source          String   @default("DIVAR")      // discriminator for multi-source
  externalId      String   @unique                 // Divar token
  readQueueId     String   @unique                 // FK → PostToReadQueue
  code            Int      @default(autoincrement()) // starts at 1000

  // Category
  categoryId      String?
  categorySlug    String
  cat1, cat2, cat3         String?                 // category hierarchy slugs

  // Titles & Description
  title, seoTitle, seoDescription
  displayTitle, displaySubtitle
  shareTitle, shareUrl, permalink
  description              String?

  // Contact
  contactUuid, phoneNumber, ownerName, businessRef
  businessType, conversionType

  // Timestamps
  listedAt, expiresAt, publishedAt    DateTime?
  publishedAtJalali                   String?

  // Status
  status          PostAnalysisStatus @default(PENDING)

  // Prices (all Decimal(18,0)?)
  priceTotal, pricePerSquare, depositAmount, rentAmount
  dailyRateNormal, dailyRateWeekend, dailyRateHoliday, extraPersonFee

  // Property specs
  area, landArea, rooms, floor         Int?
  floorsCount, unitPerFloor, yearBuilt, capacity  Int?
  areaLabel, landAreaLabel, roomsLabel, floorLabel
  floorsCount?, unitPerFloor?, yearBuiltLabel, capacityLabel   String?

  // Feature flags (Boolean?)
  hasParking, hasElevator, hasWarehouse, hasBalcony
  isRebuilt, photosVerified, imageCount

  // Geo (Decimal(12,8)?)
  latitude, longitude

  // Location IDs
  provinceId, cityId, districtId       Int?
  provinceName, citySlug, cityName, districtSlug, districtName  String?

  // Raw original payload
  rawPayload      Json

  // Relations
  medias          DivarPostMedia[]
  attributes      DivarPostAttribute[]
  notes           DivarPostNote[]

  // Phone fetch tracking
  phoneFetchStatus     PhoneFetchStatus @default(PENDING)
  phoneFetchLockedUntil DateTime?
  phoneFetchLeaseId    String?
  phoneFetchWorker     String?
  phoneFetchAttemptCount Int @default(0)
  phoneFetchLastError  String?
}
```

---

## Stage 4: Media Sync (`divar:sync-media`)

**Script:** `server/src/scripts/run-divar-post-media-sync.ts`
**Service:** `DivarPostMediaSyncService` (`server/src/modules/divar-posts/divar-post-media-sync.service.ts`)

### What it does

1. Finds `DivarPostMedia` records with `divarcdn.com` URLs that haven't been synced yet (no `localUrl`/`localThumbnailUrl`)
2. Batch size: 25 per run
3. For each media:
   - Downloads from the original CDN URL
   - Uploads to MinIO via `StorageService`
   - Updates `localUrl` and `localThumbnailUrl` on the `DivarPostMedia` record
4. Skips media that already have local URLs

This ensures all post images are served from the application's own storage, avoiding dependency on the external CDN.

---

## Stage 5: Contact Fetch (on-demand)

**Script:** `server/src/scripts/run-divar-contact-fetch.ts`
**Service:** `DivarContactFetchService` (`server/src/modules/divar-posts/divar-contact-fetch.service.ts`)

- No active cron (manually triggered or via API endpoints)
- Uses `AdminDivarSession` JWT tokens to authenticate
- Calls `POST https://api.divar.ir/v8/postcontact/web/contact_info_v2/{externalId}`
- Extracts and normalizes Persian phone numbers
- Stores `phoneNumber` on the `DivarPost` record

---

## Cron Schedules

All pipelines respect `ENABLE_CRON_JOBS` (kills witch). Each has a running guard to prevent overlap.

| Pipeline | Default Cron | Config Env |
|---|---|---|
| Harvest | `every 10 seconds` | `DIVAR_HARVEST_CRON` |
| Fetch | `every 10 seconds` | `DIVAR_FETCH_CRON` |
| Analyze | `every 10 seconds` | `DIVAR_ANALYZE_CRON` |
| Media Sync | `every 10 seconds` | `DIVAR_MEDIA_SYNC_CRON` |

---

## Extension Points for New Crawlers

The pipeline is designed for multi-source extensibility:

| Component | Extension Point |
|---|---|
| **PostToReadQueue.source** | Set to a different value (e.g., `"MELK_RADAR"`, `"SHEYPUR"`) |
| **PostToAnalyzeQueue.source** | Same discriminator |
| **DivarPost.source** | Same discriminator — all posts in one table |
| **Parser** | Implement a new parser class producing `ParsedDivarPost` (the universal IR) |
| **persistParsedPost()** | Reusable for any source — it only reads `ParsedDivarPost` |

To add a new site:
1. Create a **parser** that maps the new site's API response to `ParsedDivarPost`
2. Create a **harvest service** to fetch listings and write tokens to `PostToReadQueue`
3. Create a **fetch service** to fetch details and write raw payload to `PostToAnalyzeQueue`
4. Create an **analyze service** that calls your parser + `persistParsedPost()`

---

## File Map

```
server/src/modules/divar-posts/
├── divar-posts.module.ts              # Nest module wiring
├── divar-post-harvest.service.ts      # Stage 1: search & enqueue
├── divar-post-fetch.service.ts        # Stage 2: detail fetch
├── divar-post-analyze.service.ts      # Stage 3: parse & persist
├── divar-post-parser.ts              # Transformation engine (Divar → IR)
├── divar-post-media-sync.service.ts   # Stage 4: CDN → MinIO
├── divar-contact-fetch.service.ts     # Stage 5: phone number fetch
├── divar-posts.controller.ts          # Public/user endpoints
├── divar-posts-admin.controller.ts    # Admin endpoints
├── divar-posts-admin.service.ts       # Admin query logic
├── divar-post-stats.service.ts        # Aggregation/reports
├── dto/
│   ├── divar-post.dto.ts              # List/detail DTOs
│   ├── post-to-analyze.dto.ts         # Analyze queue DTOs
│   ├── divar-post-category-count.dto.ts
│   └── divar-post-district-report.dto.ts

server/src/scripts/
├── run-divar-post-harvest.ts           # Manual harvest trigger
├── run-divar-post-fetch.ts             # Manual fetch trigger
├── run-divar-post-analyze.ts           # Manual analyze trigger
├── run-divar-post-media-sync.ts        # Manual media sync trigger
├── run-divar-contact-fetch.ts          # Manual contact fetch trigger
├── sync-divar-categories.ts            # Category sync
└── sync-divar-category-filters.ts      # Category filter sync

server/prisma/schema.prisma            # All models (DivarPost, PostToReadQueue, etc.)
```
