export type NotificationFilterSnapshot = {
  id: string;
  name: string;
};

export type NotificationPostSnapshot = {
  id: string;
  code: number | null;
  title: string | null;
  description: string | null;
  priceTotal: number | null;
  rentAmount: number | null;
  depositAmount: number | null;
  pricePerSquare: number | null;
  area: number | null;
  cityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  permalink: string | null;
  publishedAt: string | null;
  previewImageUrl: string | null;
};

export type NotificationItem = {
  id: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  message: string | null;
  sentAt: string | null;
  failedAt: string | null;
  readAt: string | null;
  createdAt: string;
  attemptCount: number;
  filter: NotificationFilterSnapshot;
  post: NotificationPostSnapshot;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
