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
  aboutDescription: string | null;
  address: string | null;
  updatedAt?: string;
};
