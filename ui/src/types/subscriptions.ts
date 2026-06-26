import type { SubscriptionPackage } from '@/types/packages';

export type DistrictAssignment = {
  id: number;
  name: string;
  cityId: number;
  provinceId: number;
  cityName: string;
};

export type UserSubscription = {
  id: string;
  packageId: string;
  discountCodeId: string | null;
  inviteCodeId: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  isTrial: boolean;
  startsAt: string;
  endsAt: string;
  basePrice: string;
  finalPrice: string;
  bonusDays: number;
  createdAt: string;
  updatedAt: string;
  districtAssignments: Record<string, DistrictAssignment[]>;
  package?: Pick<
    SubscriptionPackage,
    | 'id'
    | 'title'
    | 'durationDays'
    | 'freeDays'
    | 'includedUsers'
    | 'isTrial'
    | 'trialOncePerUser'
    | 'features'
  >;
};

export type ActivateSubscriptionPayload = {
  packageId: string;
  discountCode?: string;
  inviteCode?: string;
};
