export const SUPPORTED_NUMBER_RANGE_KEYS = new Set([
  'price',
  'price_per_square',
  'rent',
  'credit',
  'size',
  'floor',
  'floors_count',
  'unit_per_floor',
  'land_area',
  'building-age',
  'person_capacity',
  'daily_rent',
]);

export const SUPPORTED_MULTI_SELECT_KEYS = new Set([
  'business-type',
  'addon_service_tags',
  'building_direction',
  'cooling_system',
  'heating_system',
  'floor_type',
  'warm_water_provider',
  'rooms',
  'deed_type',
]);

export const SUPPORTED_SINGLE_SELECT_KEYS = new Set(['recent_ads', 'toilet']);

export const SUPPORTED_TOGGLE_KEYS = new Set([
  'parking',
  'elevator',
  'warehouse',
  'balcony',
  'rebuilt',
  'has-photo',
  'has-video',
  'has_video',
  'bizzDeed',
]);

export const IGNORED_FILTER_KEYS = new Set(['districts']);

export const TRANSLATED_WIDGET_LABEL_KEYS = [
  'filter_price',
  'filter_size',
  'filter_price_per_square',
  'filter_rooms',
  'filter_building-age',
  'filter_floor',
  'filter_floors_count',
  'filter_unit_per_floor',
  'filter_rent',
] as const;

export type TranslatedWidgetLabelKey = (typeof TRANSLATED_WIDGET_LABEL_KEYS)[number];

export const TRANSLATED_WIDGET_LABEL_KEY_SET = new Set<TranslatedWidgetLabelKey>(TRANSLATED_WIDGET_LABEL_KEYS);
