# Admin Divar District Price Report

This document describes the admin report that aggregates Divar post prices by district.
It covers UI behavior, API parameters, filtering rules, and performance notes so you
can safely modify or extend the feature later.

## Overview

The report aggregates Divar posts by district and returns min/avg/max values for:
- Total price (`priceTotal`)
- Price per square (`pricePerSquare`)
- Rent (`rentAmount`)
- Deposit (`depositAmount`)

The report always filters by:
- A leaf category slug
- A createdAt date range (UTC)
- District must be present (`districtId IS NOT NULL`)
- Post status must be `COMPLETED`

The report also supports optional numeric thresholds (`minValue`, `maxValue`) that
exclude values outside the range from the min/avg/max aggregates.

Important: `postCount` counts all matching posts (category + date + district + status)
regardless of min/max thresholds. Only the price aggregates are thresholded.

## UI

Route:
- `/admin/divar-reports`

Category picker:
- Shows only leaf categories with `allowPosting = true` and `isActive = true`.
- The UI search filters the list by name + displayPath.

Filters:
- Category (required)
- Start date (required)
- End date (required)
- Minimum value (required, default `10000000`)
- Maximum value (optional, blank means no upper bound)

Summary line:
- Shows category, date range, district count, total post count, min value,
  and max value if set.

## API

Endpoint:
- `GET /api/admin/divar-posts/district-prices`

Auth:
- Admin only (JWT + role guard).

Query parameters:
- `categorySlug` (string, required)
- `from` (string, required)
- `to` (string, required)
- `minValue` (number, optional, default = 10000000)
- `maxValue` (number, optional, default = null)

Validation:
- `categorySlug` must exist and be a leaf category.
- `from` and `to` must be valid dates and `from < to`.
- `minValue` must be a non-negative number.
- `maxValue` must be a non-negative number when provided.
- If `maxValue` is provided, it must be >= `minValue`.

Date handling:
- If `from` or `to` are date-only (YYYY-MM-DD), the server treats them as
  UTC midnight for that day.
- `to` is exclusive. When `to` is date-only, the server adds +1 day to make
  the range include the full "to" day.

Example:
```
GET /api/admin/divar-posts/district-prices?categorySlug=apartment-sell&from=2025-12-01&to=2025-12-25&minValue=10000000&maxValue=500000000
```

Response (array of rows):
```
[
  {
    "districtId": 123,
    "districtName": "Sample District",
    "districtSlug": "sample-district",
    "postCount": 42,
    "minPriceTotal": 120000000,
    "avgPriceTotal": 185000000,
    "maxPriceTotal": 240000000,
    "minPricePerSquare": 3000000,
    "avgPricePerSquare": 4200000,
    "maxPricePerSquare": 5200000,
    "minRentAmount": 15000000,
    "avgRentAmount": 20000000,
    "maxRentAmount": 28000000,
    "minDepositAmount": 200000000,
    "avgDepositAmount": 260000000,
    "maxDepositAmount": 340000000
  }
]
```

If a metric has no values within the min/max range, its min/avg/max is `null`.

## Category matching rules

The report matches the requested leaf category against the post fields using:
- `cat3`
- `categorySlug`
- `cat2` (only when `cat3` is NULL)
- `cat1` (only when `cat3` and `cat2` are NULL)

This is required because harvesting can assign a parent category to
`categorySlug` when allowPosting is set at higher levels. Leaf selection in
the UI uses `cat3` (or `cat2`/`cat1` fallback), so the API aligns with that.

## Threshold rules (min/max)

Thresholds apply independently per field:
- `priceTotal` uses the min/max filter for priceTotal only
- `pricePerSquare` uses the min/max filter for pricePerSquare only
- `rentAmount` uses the min/max filter for rentAmount only
- `depositAmount` uses the min/max filter for depositAmount only

If `maxValue` is not provided, only the minimum is enforced.

`postCount` is not affected by min/max thresholds.

## Performance

Indexes used (Prisma schema):
- `@@index([categorySlug, createdAt, districtId])`
- `@@index([cat3, createdAt, districtId])`

These support filtering by category and date, then grouping by district.
When changing the category matching logic, ensure the indexes still cover the
new query patterns.

## Troubleshooting

No rows returned:
- Verify the date range uses UTC and matches createdAt values.
- Confirm posts exist with districtId set.
- Confirm the category is a leaf and is correctly mapped to cat3/cat2/cat1.
- If you use a maxValue, ensure it is not smaller than minValue.

Common errors:
- `Category must be a leaf category.` -> The category has children.
- `Invalid date range.` -> `from` or `to` invalid, or `from >= to`.
- `Minimum value is invalid.` -> `minValue` missing or negative.
- `Maximum value must be greater than minimum value.` -> `maxValue < minValue`.
