export type WebsiteContact = {
  name: string;
  phone: string;
};

export type WebsiteSettings = {
  key: string;
  phoneContacts: WebsiteContact[];
  instagramUrl: string | null;
  telegramChannelUrl: string | null;
  telegramBotUrl: string | null;
  baleBotUrl: string | null;
  aboutDescription: string | null;
  address: string | null;
  turnstileEnabled: boolean;
  taxPercentage: number;
  paymentTimeLimitDays: number;
  updatedAt?: string;
};
