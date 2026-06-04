# MelkRadar → DivarPost Conversion Pipeline

## Overview

Reads `AdminMelkradarPost` records for Karaj (`cityId=2`) and transforms them into `DivarPost` + `DivarPostMedia` + `DivarPostAttribute` records. Processes newest-first with configurable concurrency (default 5).

**Entry point:** `src/scripts/run-melkradar-to-divar.ts`  
**Service:** `src/modules/melkradar/melkradar-to-divar.service.ts`  
**NPM script:** `npm run melkradar:to-divar -- --count <N>`

---

## All Fixes Made

### 1. District matching overhaul

**Problem:** Only exact name matches worked. Inputs like `کرج، بلوار ارم - مهرشهر`, `جهانشهر`, `زنبق`, `شهرک گلها`, `حیدر آباد - عدل` failed to match any district.

**Fix:** Replaced single-exact-match with a 10-step pipeline (see full pipeline below).

### 2. District errors → warnings (no longer fatal)

**Problem:** Unmatchable district names (`بلوار ارم`, `داریوش`, `۳۵۰ متری`, `سراسر استان البرز`) threw errors and skipped the post.

**Fix:** `logger.warn` + `districtId: null` — the post is created without a district.

### 3. Category mapping: `|سایر|` → `real-estate-services`

**Problem:** `|سایر|` mapped to `other-services` which didn't exist in the `DivarCategory` table, causing a fatal category error.

**Fix:** Changed to `{ cat2: 'real-estate-services', cat3: 'real-estate-services' }` — the parent category slug.

### 4. `yearBuilt` now outputs Jalali years

**Problem:** `builtDate` values like `4/12/2005` (Gregorian) were stored as-is instead of converting to the Jalali (Shamsi) calendar year.

**Fix:** `parseYearBuilt` parses `new Date(builtDate)` then runs `toJalaali(d).jy` via `jalaali-js`. Output is now in range 1370–1404.

### 5. INT4 overflow guard for `area`

**Problem:** Two records had `areaSize` values of ~130 billion (Float overflow from bad source data). `Math.round()` created a value > INT4 max (2,147,483,647), crashing `divarPost.create()`.

**Fix:** Added `safeInt()` helper that returns `null` if value exceeds `INT4_MAX`. Applied to `area` field. Attribute `number` values already had the same guard.

### 6. Stripped redundant `*ByAI` attribute fields

**Problem:** `radarCode`, `advertType`, `cityAreaId`, `analysisDateTime`, `realtorAnalyzeDateTime`, `builtDate`, `adverTypeTitle`, `estateTypeTitle`, `estateTypeGroupTitle`, `isRenovatedByAI`, `deedTypeByAI`, `directionByAI`, `unitsPerFloorByAI`, `totalFloorsByAI`, `phaseByAI`, `isLightingGoodByAI` were being stored as `DivarPostAttribute` records — these are raw source fields with no Divar-side meaning.

**Fix:** Removed them from `ATTRIBUTE_DEFS` (the first batch) and added the `*ByAI` fields to `SKIP_FIELDS`. 153,339 orphaned `DivarPostAttribute` records were deleted from DB.

### 7. Transaction timeout tuning

**Problem:** `maxWait=5000, timeout=5000` caused frequent transaction contention errors at default concurrency.

**Fix:** Increased to `maxWait=15000, timeout=10000`. Added `connection_limit=30` to both `DATABASE_URL` and `DATABASE_DIRECT_URL`.

### 8. Error logging to file

**Problem:** Errors in batch processing were only printed to console — no persistent record for debugging.

**Fix:** The `run-melkradar-to-divar.ts` script writes structured error entries to `server/tmp/melkradar-skip-errors-{timestamp}.log` with the full Prisma error message and context. The `tmp/` + `server/tmp/` directories are in `.gitignore`.

### 9. `phaseByAI` type change

**Problem:** Prisma schema had `phaseByAI Int?` but source data could contain string values like `"فاز 4"`.

**Fix:** Changed schema to `phaseByAI String?`, ran a migration.

---

## District Matching Pipeline

Located in `matchDistrict()` at `melkradar-to-divar.service.ts:399`. Processes one `cityAreaTitle` string per post.

### Normalization (`normalizeDistrictName`)

Before any matching, the input is normalized:

1. Strip leading `البرز، ` or `کرج، ` prefix
2. Convert Persian digits (`۰-۹`) to Latin (`0-9`)
3. Convert Arabic digits (`٠-٩`) to Latin (`0-9`)
4. Collapse ZWNJ (`‌`) and whitespace into single spaces
5. Trim

District names from the DB go through the same normalization before being added to the lookup map.

### Match Steps

Each step attempts to match the normalized cityAreaTitle against the set of Karaj district names:

```
Step 0: Build normToDistrict map
  - normalize each DB district name → DistrictInfo
  - deduplicated by normalized key

Step 1: Exact match
  - full normalized input matches a normalized district name
  - e.g. "مهرشهر" → "مهرشهر" ✓

Step 1b: tryStripPrefix
  - if input starts with a known prefix (شهرک, کوی, بلوار, etc.),
    strip it and retry
  - first tries exact, then matchWithPrefix on the remainder
  - e.g. "شهرک گلها" → strip "شهرک" → remainder "گلها" → matchWithPrefix → "کوی گلها" ✓

Step 2: Split on " - "
  - if input has " - " separator, extract first part and the rest

  Step 2a: Reversed parts
  - "مهرشهر - فاز 4" → try "فاز 4 مهرشهر"
  - Handles compound areas where the specific place name is after the dash

  Step 2b: Combined
  - "مهرشهر - فاز 4" → try "مهرشهر فاز 4"

  Step 2c: First part exact
  - "مهرشهر - فاز 4" → try "مهرشهر"

  Step 2d: Prefix prepend (short first parts)
  - if first part ≤ 5 characters, try "کوی {firstPart}", "شهرک {firstPart}", etc.
  - e.g. "زنبق - فاز 3" → first part "زنبق" → "کوی زنبق" ✓

  Step 2e: First part contained (space-insensitive)
  - "جهانشهر - فاز 2" → first part "جهانشهر" contained in "جهان‌شهر" ✓
  - also tries with all spaces removed (handles "حیدر آباد" → "حیدرآباد")

Step 3: Single part — prefix prepend
  - same as 2d but without a dash split
  - e.g. "زنبق" → "کوی زنبق" ✓

Step 4: Single part contained (space-insensitive)
  - same as 2e but without a dash split
  - e.g. "جهانشهر" → contained in "جهان‌شهر" ✓
  - e.g. "حیدر آباد" (with space) → space-insensitive against "حیدرآباد" (without space) ✓

Step 5: District name contained in input (longest-first, space-insensitive)
  - sorts district names by length descending
  - checks if any district name appears as a substring of the input
  - also checks with all spaces stripped both sides
  - e.g. "کرج، بلوار ارم - مهرشهر" → after prefix strip → "بلوار ارم - مهرشهر"
    → split → "بلوار ارم" + "مهرشهر" → none match at Steps 2a-2e
    → Step 5: "مهرشهر" (length 6) contained in "بلوار ارم - مهرشهر" → ✓
  - Also handles: "بلوار ارم" contained in "بلوار ارم - مهرشهر" → wait... 
    Actually Step 2e runs first on firstPart="بلوار ارم" which is > 5 chars so skips 2d,
    then tries containment — "بلوار ارم" is NOT contained in any district name.
    Then Step 5 kicks in and checks if any district name is in the input.
    "بلوار ارم" is NOT a district, so no match. Falls through to null → warn + continue.
```

### Known Prefixes for Steps 1b, 2d, 3

```
کوی, شهرک, بلوار, خیابان, کوچه, میدان, بزرگراه
```

### Expected Unmatched Names

These pass with `districtId: null` (warning logged):

| Pattern | Reason |
|---|---|
| `بلوار ارم` | A boulevard, not a district name |
| `بلوار ارم - مهرشهر` | "بلوار ارم" ∈ مهرشهر, but "بلوار ارم" is not a district |
| `داریوش` | No Karaj district by this name |
| `اشتراکی - جهازی ها` | "اشتراکی" is a listing type, "جهازی ها" ≠ any district |
| `سراسر استان البرز` | Province-level title, not a district |
| `هشتگرد`, `فردیس`, `ماهدشت`, `کمالشهر` | Separate cities in Alborz province, not Karaj districts |
| `میدان نبوت`, `نبوت` | No Karaj district by this name |
| `شهر جدید هشتگرد` | Not a Karaj district |
| `کوی قائم` | No Karaj district named "کوی قائم" in the DB |
| `۳۵۰ متری` | An area size, not a district |
| `کیانمهر` | Not in Karaj district list |

---

## Manual DB Backup

**Script:** `backup/manual-backup.sh`

A one-shot `pg_dump` wrapper for ad-hoc backups. Run from the project root:

```bash
./backup/manual-backup.sh
```

### What it does

1. Reads `DATABASE_URL` and `NODE_ENV` directly from `.env` (handles CRLF line endings)
2. Strips query params (`?schema=public&connection_limit=30`) from the URL — `pg_dump` chokes on them
3. Maps `NODE_ENV` to a file prefix: `development` → `dev`, `production` → `prod`
4. Calls `pg_dump -Fc -v` (custom compressed format with verbose progress)
5. Writes to `backup/{prefix}-my-ads-{YYYYMMDD_HHMMSS}.dump`

### Output example

```
Dumping database to backup/dev-my-ads-20260604_030000.dump ...
pg_dump: saving database definition
pg_dump: dumping contents of table "DivarPost"
...
Done — Saved: backup/dev-my-ads-20260604_030000.dump
```

### Restore

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "${DATABASE_DIRECT_URL%%\?*}" \
  backup/dev-my-ads-20260604_030000.dump
```

### Git ignore

`/backup/*.dump` and `/backup/*.sql` are in `.gitignore` — dump files stay local, the script itself (`manual-backup.sh`) is tracked.
