import type { SubscriptionPackage } from '@/types/packages';

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
  package?: Pick<
    SubscriptionPackage,
    | 'id'
    | 'title'
    | 'durationDays'
    | 'freeDays'
    | 'includedUsers'
    | 'savedFiltersLimit'
    | 'isTrial'
    | 'trialOncePerUser'
    | 'allowDiscountCodes'
    | 'allowInviteCodes'
  >;
};

export type ActivateSubscriptionPayload = {
  packageId: string;
  discountCode?: string;
  inviteCode?: string;
};
