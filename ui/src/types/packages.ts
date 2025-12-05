export type SubscriptionPackage = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  savedFiltersLimit: number;
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
  actualPrice: number;
  discountedPrice: number;
  isActive?: boolean;
};

export type UpdatePackagePayload = Partial<CreatePackagePayload>;
