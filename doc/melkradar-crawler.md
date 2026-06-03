# MelkRadar Crawler Pipeline

## Overview

MelkRadar (ملک رادار) is a real estate dashboard that aggregates adverts from Divar.ir and Sheypoor.com. Unlike the raw Divar API pipeline, MelkRadar provides **pre-enriched data** — phone numbers, prices, and metadata are already parsed in the API response.

The MelkRadar pipeline has **2 stages**:

```
[MelkRadar API]
    │
    ▼ Stage 1: GET ARCHIVES  ── melkradar:get-archives ──→ AdminMelkradarArchive (DB)
    │
    ▼ Stage 2: FETCH POSTS   ── melkradar:fetch-posts ──→ AdminMelkradarPost (DB)
```

---

## Prerequisites

An active **MelkRadar session** must exist in the `AdminMelkradarSession` table. Create one via the admin panel:

1. Log into `https://realtorpanel.melkradar.com` in your browser
2. Open DevTools → Network tab
3. Find any XHR request to `realtorpanel.melkradar.com`
4. Right-click → **Copy as cURL**
5. Paste the Cookie header (or the full curl) into the admin session form

The session stores `headersRaw` (the raw Cookie string) and `headers` (parsed JSON). Only sessions with `active=true` and `locked=false` are used.

---

## Stage 1: Get Archives (`melkradar:get-archives`)

**Script:** `server/src/scripts/run-melkradar-get-archives.ts`
**Service:** `MelkradarArchiveService` (`server/src/modules/melkradar/melkradar-archive.service.ts`)

### What it does

1. Reads the active `AdminMelkradarSession` from the database
2. Calls `POST https://realtorpanel.melkradar.com/odata/ClientApp/archiveFolder/getRealtorArchiveFolders` with the session's Cookie header
3. For each returned folder:
   - If `archiveFolderId` already exists in `AdminMelkradarArchive` → **update** the record
   - If not → **create** a new record

### Archive Folder Structure

Each folder represents a **(season × year × city zone)** combination:

| Field | Type | Example |
|---|---|---|
| `ArchiveFolderId` | GUID | `9c41f1be-9919-485b-b229-e1e9445b5baf` |
| `Title` | string | `پاییز ۱۴۰۴ منطقه ۸ کرج` |
| `PersianSeason` | string | `بهار`, `تابستان`, `پاییز`, `زمستان` |
| `PersianYear` | string | `۱۴۰۱` – `۱۴۰۴` |
| `PersianCityZoneTitle` | string | `منطقه ۸ کرج` |
| `Count` | number | Number of posts in this folder |
| `Quarter` | string | `Q1`, `Q2`, `Q3`, `Q4` |
| `CityZoneCode` | string | `1`, `4`, `5`, `6`, `7`, `8`, `9`, `12` |
| `year` | string | Gregorian year `1401`–`1404` |

### DB Table

```prisma
model AdminMelkradarArchive {
  id                   String   @id @default(uuid())
  archiveFolderId      String   @unique
  title                String
  persianSeason        String
  persianYear          String
  persianCityZoneTitle String
  count                Int
  quarter              String
  cityZoneCode         String?
  year                 String?
  isShared             Boolean?
  folderOwnerId        String?
  folderOwnerName      String?
  price                Decimal?
  syncStatus           String   @default("PENDING")
  lastPageFetched      Int      @default(0)
  lastFetchedAt        DateTime?
  lastError            String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

### Running

```bash
npm run melkradar:get-archives
```

Idempotent — safe to re-run. Updates existing records, creates new ones.

---

## Stage 2: Fetch Posts (`melkradar:fetch-posts`)

**Script:** `server/src/scripts/run-melkradar-fetch-posts.ts`
**Service:** `MelkradarPostService` (`server/src/modules/melkradar/melkradar-post.service.ts`)

### What it does

1. Reads the active `AdminMelkradarSession` from the database
2. Finds all non-COMPLETED archives ordered by `syncStatus ASC, createdAt ASC` (PENDING first, then IN_PROGRESS)
3. For each archive, calls `POST .../getArchiveFiles` with pagination:

```
POST https://realtorpanel.melkradar.com/odata/ClientApp/archiveFolder/getArchiveFiles
{
  "ArchiveFolderId": "...",
  "PageSize": 500,
  "PageNumber": 1,
  "Filter": {}
}
```

4. Each page's items are upserted into `AdminMelkradarPost` using `(source, externalId)` as the unique key

### Resume Logic

- Archives with `syncStatus = IN_PROGRESS` resume from `lastPageFetched + 1`
- Archives with `syncStatus = PENDING` start from page 1
- After each successful page, `lastPageFetched` and `lastFetchedAt` are updated in the DB
- If a page returns fewer items than `PageSize` or an empty array, the archive is marked `COMPLETED`
- On error, the archive's `lastError` is recorded and processing moves to the next archive

### Rate Limiting & Timeout

- **5-second delay** between page requests (`DELAY_BETWEEN_PAGES_MS = 5_000`)
- **5-second HTTP timeout** per API call (`timeout: 5_000`)
- Page size: 500 (tested max)

### DB Table: `AdminMelkradarPost`

```prisma
model AdminMelkradarPost {
  id                    String   @id @default(uuid())
  archiveFolderId       String
  externalId            String
  source                String        // "Divar" or "Sheypoor"

  melkradarId           String?
  url                   String?
  contactPhone          String?
  radarCode             String?

  sellTotalPrice        Decimal?
  rentMonthlyPrice      Decimal?
  rentMortgagePrice     Decimal?
  sellUnitPrice         Decimal?
  priceTypeStr          String?

  adverTypeTitle        String?
  estateTypeTitle       String?
  estateTypeGroupTitle  String?
  advertType            String?

  areaSize              Float?
  bedroomCount          Int?
  summary               String?
  description           String?

  latitude              Float?
  longitude             Float?
  isExactLocation       Boolean?
  cityAreaId            String?
  cityAreaTitle         String?
  cityAreaGroupTitle    String?

  hasParking            Int?
  hasElevator           Int?
  hasWarehouse          Int?
  hasBalcony            Int?

  floorNumber           Int?
  floorNumberStr        String?
  builtDate             String?
  calculatedBuildingAge Int?
  isRenovatedByAI       Boolean?
  deedTypeByAI          String?
  directionByAI         String?
  unitsPerFloorByAI     Int?
  totalFloorsByAI       Int?
  phaseByAI             Int?
  isLightingGoodByAI    Boolean?

  isActive              Boolean?

  adverDateTime         DateTime?
  analysisDateTime      DateTime?
  realtorAnalyzeDateTime DateTime?

  vendorImageUrls       Json?
  adverImageUrls        Json?
  imageCount            Int?

  rawPayload            Json?
  analyzed              Boolean  @default(false)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([source, externalId])
  @@index([archiveFolderId])
}
```

### Running

```bash
npm run melkradar:fetch-posts
```

Idempotent — safe to re-run. Uses `upsert` so existing rows are updated, new rows created. Unfinished archives (IN_PROGRESS) resume from their last page.

### Sync Status State Machine

```
PENDING ──→ IN_PROGRESS ──→ COMPLETED
                │
                ▼
            (error) ──→ PENDING (stays IN_PROGRESS with lastError set)
```

- `PENDING`: not yet processed
- `IN_PROGRESS`: currently being fetched (or crashed mid-fetch — resumed on next run)
- `COMPLETED`: all pages fetched

### `analyzed` Field

The `analyzed` boolean field (default `false`) is a marker for the future data analyzer script. It indicates whether the post has been processed by the analyzer. Not used by the fetcher.

---

## API Response Structure (`RealtorAppEstateMarkerDto`)

| Field | Type | Description |
|---|---|---|
| `Id` | GUID | Internal MelkRadar record ID |
| `MelkId` | string | External ID (Divar token like `gXjvYJp` or Sheypoor numeric ID) |
| `Url` | string | Source URL (`https://divar.ir/v/...` or sheypoor.com) |
| `VendorTypeTitle` | string | `Divar` or `Sheypoor` |
| `ContactPhone` | string | **Phone number already included** |
| `RadarCode` | string | MelkRadar internal code |
| `SellTotalPrice` | number? | فروش |
| `RentMonthlyPrice` | number? | اجاره ماهانه |
| `RentMortgagePrice` | number? | ودیعه |
| `SellUnitPrice` | number? | قیمت واحد |
| `PriceTypeStr` | string | `FullAdaptive` or empty |
| `AdverTypeTitle` | string | `فروش`, `رهن و اجاره`, `پیش فروش` |
| `EstateTypeTitle` | string | `آپارتمان`, `ویلا`, `زمین و کلنگی`, `مغازه`, `اداری`, `صنعتی` |
| `EstateTypeGroupTitle` | string | `residential`, `office` |
| `AreaSize` | number | متراژ |
| `AreaSizeStr` | string | Formatted size with unit |
| `BedroomCount` | number? | تعداد خواب |
| `Summary` | string | متن آگهی |
| `Description` | string? | توضیحات کامل |
| `Latitude`, `Longitude` | number | موقعیت |
| `Parking`, `Elevator`, `Warehouse`, `Balcony` | 0/1/null | امکانات |
| `FloorNumber` | number? | طبقه |
| `FloorNumberStr` | string? | `همکف از ۲` |
| `BuiltDate` | string | تاریخ ساخت |
| `BuiltDateMin` | string | حداقل تاریخ ساخت |
| `CalculatedBuildingAge` | number? | سن ساختمان محاسبه شده |
| `IsRenovatedByAI` | boolean? | بازسازی شده |
| `HasDocumentByAI` | boolean? | دارای سند |
| `DirectionByAI` | string? | جهت ساختمان |
| `UnitsPerFloorByAI` | number? | تعداد واحد در طبقه |
| `TotalFloorsByAI` | number? | totalFloors |
| `PhaseByAI` | number? | فاز |
| `DeedTypeByAI` | string? | نوع سند |
| `CityAreaId` | GUID | منطقه |
| `CityAreaTitle` | string | نام منطقه |
| `CityAreaGroupTitle` | string? | ناحیه |
| `AdverDateTime` | string | تاریخ انتشار |
| `AnalysisDateTime` | string | تاریخ آنالیز |
| `RealtorAnalyzeDateTime` | string | تاریخ آنالیز توسط مشاور |
| `ExpressRemainedDay` | number | روزهای باقی‌مانده |
| `VendorImageUrls` | string[] | URLs تصاویر |
| `ImageCount` | number | تعداد تصاویر |
| `AdverKind` | object | `{ AdverCategory: "UsualAdver", AdverButtons: [] }` |
| `IsActive` | boolean | وضعیت فعال |
| `IsRequested` | boolean | درخواست شده |
| `IsFoldered` | boolean | پوشه‌بندی شده |
| `FolderTitle` | string? | عنوان پوشه |
| `OwnerFullName` | string? | نام مالک |
| `Address` | string? | آدرس |
| `FileCode` | string? | کد پرونده |
| `RealtorAdverReports` | array | گزارش‌ها |
| `ManualValidationStatus` | string? | وضعیت اعتبارسنجی دستی |
| `ManCheckUserName` | string? | نام کاربر بررسی‌کننده |

### Pagination

- `PageSize`: max per page (tested up to 500)
- `PageNumber`: 1-based
- No `@odata.count` or `@odata.nextLink` — iterate pages until an empty `value` array or error

---

## Comparison with Divar Pipeline

| Aspect | Divar Pipeline | MelkRadar Pipeline |
|---|---|---|
| Source | Divar API directly | MelkRadar (aggregates Divar + Sheypoor) |
| Phone number | Separate contact-fetch stage **required** | **Already included** in response |
| Widget parsing | Complex `DivarPostParser` with 8+ widget types | **Not needed** — data is pre-parsed |
| Media | CDN images need sync (`divar:sync-media`) | `VendorImageUrls` available directly |
| Categories | Multiple category slugs (`cat1`, `cat2`, `cat3`) | Not needed (already `EstateTypeTitle`) |
| Session/Auth | Cookie + JWT session managed in `AdminDivarSession` | Cookie + Bearer token in `AdminMelkradarSession` |
| Archive folders | Category × location combos computed from DB | Pre-defined folders by season/region |

---

## File Map

```
server/src/modules/melkradar/
├── melkradar.module.ts                          # Module wiring (registers both services)
├── admin-melkradar-sessions.controller.ts        # Admin session CRUD
├── admin-melkradar-sessions.service.ts           # Session management
├── melkradar-archive.service.ts                  # Stage 1: fetch & store archives
├── melkradar-post.service.ts                     # Stage 2: fetch posts with pagination + resume
├── dto/
│   └── admin-melkradar-session.dto.ts            # Session DTOs

server/src/scripts/
├── run-melkradar-get-archives.ts                 # Manual archive sync trigger
├── run-melkradar-fetch-posts.ts                  # Manual post fetch trigger

server/prisma/schema.prisma
├── model AdminMelkradarSession                    # Session store (headers + cookies)
├── model AdminMelkradarArchive                    # Archive folder metadata
├── model AdminMelkradarPost                      # Fetched post data (58 columns + rawPayload)
```
