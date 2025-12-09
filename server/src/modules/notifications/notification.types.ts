export type NotificationFilterSnapshot = {
  id: string;
  name: string;
};

export type NotificationPostSnapshot = {
  id: string;
  title: string | null;
  description: string | null;
  priceTotal: number | null;
  rentAmount: number | null;
  depositAmount: number | null;
  cityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  permalink: string | null;
  publishedAt: string | null;
  previewImageUrl: string | null;
};

export type StoredNotificationPayload = {
  filter: NotificationFilterSnapshot;
  post: NotificationPostSnapshot;
};

export type RealtimeNotificationPayload = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  sentAt: string | null;
  filter: NotificationFilterSnapshot;
  post: NotificationPostSnapshot;
};
