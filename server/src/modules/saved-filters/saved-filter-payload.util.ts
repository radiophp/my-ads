type SelectionMode = 'all' | 'custom';
type NoteFilterOption = 'all' | 'has' | 'none';

export type CategoryFilterValue =
  | { kind: 'numberRange'; min?: number | null; max?: number | null }
  | { kind: 'multiSelect'; values: string[] }
  | { kind: 'singleSelect'; value: string | null }
  | { kind: 'boolean'; value: boolean | null };

export type CategoryFilterBuckets = Record<string, Record<string, CategoryFilterValue>>;

export type SavedFilterPayload = {
  provinceId: number | null;
  citySelection: {
    mode: SelectionMode;
    cityIds: number[];
  };
  districtSelection: {
    mode: SelectionMode;
    districtIds: number[];
  };
  categorySelection: {
    slug: string | null;
    depth: number | null;
  };
  categoryFilters: CategoryFilterBuckets;
  ringBinderFolderId: string | null;
  noteFilter: NoteFilterOption;
};

const EMPTY_PAYLOAD: SavedFilterPayload = {
  provinceId: null,
  citySelection: { mode: 'all', cityIds: [] },
  districtSelection: { mode: 'all', districtIds: [] },
  categorySelection: { slug: null, depth: null },
  categoryFilters: {},
  ringBinderFolderId: null,
  noteFilter: 'all',
};

export function normalizeSavedFilterPayload(input: unknown): SavedFilterPayload {
  if (!isRecord(input)) {
    return { ...EMPTY_PAYLOAD };
  }

  const provinceId = parseOptionalNumber(input['provinceId']);

  const normalizedCitySelection = normalizeCitySelection(input['citySelection'], input['cityIds']);
  const normalizedDistrictSelection = normalizeDistrictSelection(
    input['districtSelection'],
    input['districtIds'],
  );

  const categorySelection = normalizeCategorySelection(input['categorySelection']);
  const categoryFilters = normalizeCategoryFilters(input['categoryFilters']);

  const ringBinderFolderId =
    typeof input['ringBinderFolderId'] === 'string' && input['ringBinderFolderId'].length > 0
      ? input['ringBinderFolderId']
      : null;

  const noteFilter = normalizeNoteFilter(input['noteFilter']);

  return {
    provinceId,
    citySelection: normalizedCitySelection,
    districtSelection: normalizedDistrictSelection,
    categorySelection,
    categoryFilters,
    ringBinderFolderId,
    noteFilter,
  };
}

function normalizeCitySelection(
  value: unknown,
  legacyIds?: unknown,
): { mode: SelectionMode; cityIds: number[] } {
  const normalized = normalizeSelectionInternal({
    value,
    legacyIds,
  });
  return { mode: normalized.mode, cityIds: normalized.ids };
}

function normalizeDistrictSelection(
  value: unknown,
  legacyIds?: unknown,
): { mode: SelectionMode; districtIds: number[] } {
  const normalized = normalizeSelectionInternal({
    value,
    legacyIds,
  });
  return { mode: normalized.mode, districtIds: normalized.ids };
}

function normalizeSelectionInternal({
  value,
  legacyIds,
}: {
  value: unknown;
  legacyIds?: unknown;
}): { mode: SelectionMode; ids: number[] } {
  if (isRecord(value)) {
    const mode = value['mode'] === 'custom' ? 'custom' : 'all';
    const idsSource = Array.isArray(value['cityIds'])
      ? value['cityIds']
      : Array.isArray(value['districtIds'])
        ? value['districtIds']
        : [];
    const normalizedIds = parseNumberArray(idsSource);
    if (mode === 'custom' && normalizedIds.length > 0) {
      return { mode, ids: normalizedIds };
    }
  }

  const fallbackIds = Array.isArray(legacyIds) ? parseNumberArray(legacyIds) : [];
  if (fallbackIds.length > 0) {
    return { mode: 'custom', ids: fallbackIds };
  }

  return { mode: 'all', ids: [] };
}

function normalizeCategorySelection(value: unknown): { slug: string | null; depth: number | null } {
  if (isRecord(value)) {
    const slug =
      typeof value['slug'] === 'string' && value['slug'].length > 0 ? value['slug'] : null;
    const depth = parseOptionalNumber(value['depth']);
    return { slug, depth };
  }
  return {
    slug: null,
    depth: null,
  };
}

function normalizeCategoryFilters(value: unknown): CategoryFilterBuckets {
  if (!isRecord(value)) {
    return {};
  }
  const result: CategoryFilterBuckets = {};
  for (const [slug, rawBucket] of Object.entries(value)) {
    if (typeof slug !== 'string' || !isRecord(rawBucket)) {
      continue;
    }
    const normalizedBucket: Record<string, CategoryFilterValue> = {};
    for (const [key, rawValue] of Object.entries(rawBucket)) {
      if (typeof key !== 'string') {
        continue;
      }
      const normalizedValue = normalizeCategoryFilterValue(rawValue);
      if (normalizedValue) {
        normalizedBucket[key] = normalizedValue;
      }
    }
    if (Object.keys(normalizedBucket).length > 0) {
      result[slug] = normalizedBucket;
    }
  }
  return result;
}

function normalizeCategoryFilterValue(value: unknown): CategoryFilterValue | null {
  if (!isRecord(value) || typeof value['kind'] !== 'string') {
    return null;
  }
  switch (value['kind']) {
    case 'numberRange': {
      const min = parseOptionalNumber(value['min']);
      const max = parseOptionalNumber(value['max']);
      if (min === null && max === null) {
        return null;
      }
      return {
        kind: 'numberRange',
        ...(min !== null ? { min } : {}),
        ...(max !== null ? { max } : {}),
      };
    }
    case 'multiSelect': {
      const values = Array.isArray(value['values'])
        ? value['values'].filter(
            (entry): entry is string => typeof entry === 'string' && entry.length > 0,
          )
        : [];
      if (values.length === 0) {
        return null;
      }
      return {
        kind: 'multiSelect',
        values,
      };
    }
    case 'singleSelect': {
      const entry =
        typeof value['value'] === 'string' && value['value'].length > 0 ? value['value'] : null;
      if (!entry) {
        return null;
      }
      return {
        kind: 'singleSelect',
        value: entry,
      };
    }
    case 'boolean': {
      const boolValue =
        typeof value['value'] === 'boolean'
          ? value['value']
          : value['value'] === true
            ? true
            : null;
      if (boolValue !== true) {
        return null;
      }
      return {
        kind: 'boolean',
        value: true,
      };
    }
    default:
      return null;
  }
}

function normalizeNoteFilter(value: unknown): NoteFilterOption {
  if (value === 'has' || value === 'none') {
    return value;
  }
  return 'all';
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseNumberArray(values: unknown[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    const parsed = parseOptionalNumber(value);
    if (parsed !== null) {
      result.push(parsed);
    }
  }
  return Array.from(new Set(result));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
