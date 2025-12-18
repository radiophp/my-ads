export type PostToAnalyzeStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type PostToAnalyze = {
  id: string;
  readQueueId: string;
  externalId: string;
  source: string;
  status: PostToAnalyzeStatus;
  seoTitle: string | null;
  createdAt: string;
  updatedAt: string;
  payload: unknown;
};

export type PaginatedPostsToAnalyze = {
  items: PostToAnalyze[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type DivarPostAttribute = {
  id: string;
  key: string;
  label: string | null;
  type: string | null;
  stringValue: string | null;
  numberValue: number | null;
  boolValue: boolean | null;
  unit: string | null;
  rawValue: unknown;
};

export type DivarPostSummary = {
  id: string;
  externalId: string;
  title: string | null;
  description: string | null;
  ownerName: string | null;
  priceTotal: number | null;
  rentAmount: number | null;
  depositAmount: number | null;
  dailyRateNormal: number | null;
  dailyRateWeekend: number | null;
  dailyRateHoliday: number | null;
  extraPersonFee: number | null;
  pricePerSquare: number | null;
  area: number | null;
  areaLabel: string | null;
  landArea: number | null;
  landAreaLabel: string | null;
  rooms: number | null;
  roomsLabel: string | null;
  floor: number | null;
  floorLabel: string | null;
  floorsCount: number | null;
  unitPerFloor: number | null;
  yearBuilt: number | null;
  yearBuiltLabel: string | null;
  capacity: number | null;
  capacityLabel: string | null;
  hasParking: boolean | null;
  hasElevator: boolean | null;
  hasWarehouse: boolean | null;
  hasBalcony: boolean | null;
  isRebuilt: boolean | null;
  photosVerified: boolean | null;
  cityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  categorySlug: string;
  businessType: string | null;
  publishedAt: string | null;
  publishedAtJalali: string | null;
  createdAt: string;
  permalink: string | null;
  imageUrl: string | null;
  mediaCount: number;
  medias: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    alt: string | null;
  }>;
  attributes?: DivarPostAttribute[] | null;
};

export type DivarPostListResponse = {
  items: DivarPostSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type DivarPostContactInfo = {
  phoneNumber: string | null;
  ownerName: string | null;
};
