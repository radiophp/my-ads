export type SubscriptionPackage = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  savedFiltersLimit: number;
  allowDiscountCodes: boolean;
  allowInviteCodes: boolean;
  isTrial: boolean;
  trialOncePerUser: boolean;
  actualPrice: string;
  discountedPrice: string;
  isActive: boolean;
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
  savedFiltersLimit?: number;
  allowDiscountCodes?: boolean;
  allowInviteCodes?: boolean;
  isTrial?: boolean;
  trialOncePerUser?: boolean;
  actualPrice: number;
  discountedPrice: number;
  isActive?: boolean;
};

export type UpdatePackagePayload = Partial<CreatePackagePayload>;
