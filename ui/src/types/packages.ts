export type SubscriptionPackage = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  isTrial: boolean;
  trialOncePerUser: boolean;
  actualPrice: string;
  discountedPrice: string;
  isActive: boolean;
  features: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type CreatePackagePayload = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  isTrial?: boolean;
  trialOncePerUser?: boolean;
  actualPrice: number;
  discountedPrice: number;
  isActive?: boolean;
  features?: Record<string, string>;
};

export type UpdatePackagePayload = Partial<CreatePackagePayload>;
