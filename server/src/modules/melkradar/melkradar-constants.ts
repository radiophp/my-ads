export interface AdverImageEntry {
  VendorImageUrl?: string;
  MelkRadarImageUrl?: string;
}

export interface CategoryInfo {
  id: string;
  slug: string;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
}

export interface DistrictInfo {
  id: number;
  slug: string;
  name: string;
}

export interface AttributeDraft {
  key: string;
  label: string | null;
  type: string | null;
  stringValue: string | null;
  numberValue: number | null;
  boolValue: boolean | null;
}

export const CATEGORY_MAP: Record<string, { cat2: string; cat3: string }> = {
  'residential|فروش|آپارتمان': { cat2: 'residential-sell', cat3: 'apartment-sell' },
  'residential|فروش|ویلا': { cat2: 'residential-sell', cat3: 'house-villa-sell' },
  'residential|فروش|زمین و کلنگی': { cat2: 'residential-sell', cat3: 'plot-old' },
  'residential|فروش|زمین': { cat2: 'residential-sell', cat3: 'plot-old' },
  'residential|رهن و اجاره|آپارتمان': { cat2: 'residential-rent', cat3: 'apartment-rent' },
  'residential|رهن و اجاره|ویلا': { cat2: 'residential-rent', cat3: 'house-villa-rent' },
  'office|فروش|مغازه': { cat2: 'commercial-sell', cat3: 'shop-sell' },
  'office|رهن و اجاره|مغازه': { cat2: 'commercial-rent', cat3: 'shop-rent' },
  'office|فروش|اداری': { cat2: 'commercial-sell', cat3: 'office-sell' },
  'office|رهن و اجاره|اداری': { cat2: 'commercial-rent', cat3: 'office-rent' },
  'office|فروش|صنعتی، کشاورزی و تجاری': {
    cat2: 'commercial-sell',
    cat3: 'industry-agriculture-business-sell',
  },
  'office|رهن و اجاره|صنعتی، کشاورزی و تجاری': {
    cat2: 'commercial-rent',
    cat3: 'industry-agriculture-business-rent',
  },
  'office|فروش|خانه': { cat2: 'residential-sell', cat3: 'house-villa-sell' },
  'office|رهن و اجاره|خانه': { cat2: 'residential-rent', cat3: 'house-villa-rent' },
  '|پیش فروش|': { cat2: 'real-estate-services', cat3: 'presell' },
  '|مشارکت|': { cat2: 'real-estate-services', cat3: 'partnership' },
  '|سایر|': { cat2: 'real-estate-services', cat3: 'real-estate-services' },
};

export const ATTRIBUTE_DEFS: Record<string, { key: string; label: string; type: string }> = {
  priceTypeStr: { key: 'price_type', label: 'نوع قیمت', type: 'string' },
  isExactLocation: { key: 'is_exact_location', label: 'مکان دقیق', type: 'boolean' },
  cityAreaGroupTitle: { key: 'city_area_group', label: 'گروه منطقه', type: 'string' },
  calculatedBuildingAge: { key: 'building_age', label: 'سن بنا', type: 'number' },
  isActive: { key: 'is_active', label: 'فعال', type: 'boolean' },
};

export const SKIP_FIELDS = new Set([
  'isRenovatedByAI',
  'deedTypeByAI',
  'directionByAI',
  'unitsPerFloorByAI',
  'totalFloorsByAI',
  'phaseByAI',
  'isLightingGoodByAI',
]);

export const DISTRICT_PREFIXES = ['کوی', 'شهرک', 'بلوار', 'خیابان', 'کوچه', 'میدان', 'بزرگراه'];

export const INT4_MAX = 2_147_483_647;
