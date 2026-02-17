export type DiscountCodeType = 'PERCENT' | 'FIXED';

export type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  type: DiscountCodeType;
  value: string;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  packageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDiscountCodePayload = {
  code: string;
  description?: string | null;
  type: DiscountCodeType;
  value: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  packageId?: string | null;
};

export type UpdateDiscountCodePayload = Partial<CreateDiscountCodePayload>;
