# Category Filter System

This document explains how Divar category filters are stored, interpreted, and surfaced inside **My Ads**. It captures the findings from the `DivarCategoryFilter` table and outlines how the dashboard should render and honor these filters.

## 1. Source of truth

- Each `DivarCategory` row (e.g., `real-estate`, `apartment-sell`) has at most one matching record inside `DivarCategoryFilter`.
- Schema:
  - `id` – UUID primary key.
  - `categoryId` – FK to `DivarCategory(id)` (unique).
  - `payload` – JSONB blob exported from Divar.
  - `createdAt` / `updatedAt`.
- As of 2025‑11‑09 the table contains **235** filters.

### Payload skeleton

```json
{
  "page": {
    "title": "فیلترها",
    "widget_list": [ /* ordered widgets */ ],
    "submit_title": "اعمال فیلترها"
  },
  "base_data": {
    "form_data": {
      "data": {
        "category": { "str": { "value": "apartment-sell" } }
      }
    }
  }
}
```

`widget_list` is the DSL that defines the UI. Each entry has:

| Field            | Meaning                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `widget_type`    | Divar component ID (`I_LAZY_MULTI_SELECT_DISTRICT_ROW`, `I_TOGGLE_ROW`, …).                  |
| `uid`            | Unique identifier (e.g., `filter_price`). `TITLE_ROW` entries omit it.                       |
| `data`           | Type-specific configuration (options, validators, labels).                                   |
| `action_log`     | Analytics metadata (not required for functionality).                                        |

`data.field.key` contains the query parameter we must emit. All keys are string-based and mirror the Divar API.

## 2. Widget catalogue

| widget_type                        | Description / Example keys                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `I_LAZY_MULTI_SELECT_DISTRICT_ROW` | Lazy district selector (`districts`). Includes `lazy_payload` for place IDs. |
| `I_MANUAL_INPUT_NUMBER_RANGE_ROW`  | Free-form numeric ranges (`price`, `credit`, `rent`).                        |
| `I_SELECTIVE_RANGE_ROW`            | Range with predefined options (`size`, `floor-count`).                       |
| `I_MULTI_SELECT_V2_ROW`            | Bottom-sheet multi select (`business-type`, `heating_system`).               |
| `I_MULTI_SELECT_CHIP_ROW`          | Inline chips (`rooms`, `document-type`).                                     |
| `I_TOGGLE_ROW`                     | Boolean switch (`parking`, `elevator`, `loan`).                              |
| `I_SINGLE_SELECT_ROW`              | Radio picker (`recent_ads`).                                                 |
| `TITLE_ROW`                        | Section headings only (no state).                                            |

Useful fields per widget:

- `field.key` / `field.type` – the request payload key (`number_range`, `repeated_string`, `boolean`, `str`, …).
- `validators` – min/max rules and error messages.
- `options` – for multi-selects and chip rows (each option has `key` or `value`, display text, search keywords).
- `cache_key` – Divar-specific caching identifier (safe to reuse).
- Copy such as `filter_page_title`, `bottom_sheet_title`, placeholders, etc.

## 3. Rendering strategy

1. Fetch filter payloads via a new endpoint (e.g., `/divar-categories/:slug/filters`). The server should parse the JSONB into a typed DTO such as:

```ts
type FilterWidget =
  | { type: 'title'; text: string }
  | { type: 'lazy-multi-select'; key: 'districts'; payload: ... }
  | { type: 'number-range'; key: 'price'; unit: 'تومان'; validators: ... }
  | { type: 'multi-select'; key: 'business-type'; options: ... }
  | ...;
```

2. The dashboard stores per-field values in Redux. Example slice:

```ts
type CategoryFiltersState = {
  [fieldKey: string]:
    | { type: 'number-range'; min?: number; max?: number }
    | { type: 'multi-select'; values: string[] }
    | { type: 'boolean'; value: boolean }
    | { type: 'lazy-district'; values: number[] };
};
```

3. Render widgets dynamically:
   - `TITLE_ROW` → `<h3>`.
   - `I_MULTI_SELECT_V2_ROW` → shared component with chips + bottom sheet.
   - `I_MANUAL_INPUT_NUMBER_RANGE_ROW` → dual input or slider.
   - `I_LAZY_MULTI_SELECT_DISTRICT_ROW` → existing district selector (already wired via `/districts`).

4. Serialize selections into the search payload given to `/divar-posts`. Example mapping:

| field.key        | Request parameter(s)                            | Prisma target                          |
| ---------------- | ------------------------------------------------ | -------------------------------------- |
| `price`          | `priceMin`, `priceMax`                          | `DivarPost.priceTotal`                 |
| `rent`           | `rentMin`, `rentMax`                            | `DivarPost.rentAmount`                 |
| `size`           | `sizeMin`, `sizeMax`                            | `DivarPost.area`                       |
| `rooms`          | `rooms[]`                                       | `DivarPostAttribute` (`rooms`)         |
| `business-type`  | `businessType[]`                                | `DivarPost.businessType`               |
| `recent_ads`     | `recentAds` (enum values 3h/12h/1d/3d/7d)        | `publishedAt >= now - interval`        |
| `addon_service_tags` | `addonServiceTags[]`                        | Attribute JSON / dedicated columns     |

Unknown keys can be logged until mappings are implemented.

## 4. Search execution

1. **Client** – When the user changes filters:
   - Update Redux.
   - Trigger `useLazyGetDivarPostsQuery` with serialized params.
2. **Server** – Extend `DivarPostsController` DTO to accept these params.
   - Map them to Prisma `where` clauses in `DivarPostsAdminService.listNormalizedPosts`.
   - For attribute-based filters, join against `DivarPostAttribute` or query JSON.
   - Log unsupported keys (`DivarPosts filter unhandled: price_per_square`).

## 5. Implementation checklist

1. Parse and expose filters:
   - [ ] Add service + DTO to read `DivarCategoryFilter.payload`.
   - [ ] API endpoint for dashboard (`/divar-categories/:slug/filters`).
2. Redux + UI:
   - [ ] Extend `searchFilter` slice with `categoryFilters`.
   - [ ] Build dynamic renderer for widget list.
3. Query serialization:
   - [ ] Convert Redux selections into query params.
   - [ ] Update `/divar-posts` call sites.
4. Backend filtering:
   - [ ] Support numeric ranges (price, rent, size).
   - [ ] Support multi-selects (rooms, business-type, verification tags).
   - [ ] Support boolean toggles (parking, elevator).
   - [ ] Add incremental mappings for remaining fields.

Keeping this README up to date ensures future contributors can extend the filter DSL without reverse-engineering the JSON blobs again.

