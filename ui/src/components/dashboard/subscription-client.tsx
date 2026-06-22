'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SubscriptionPanel } from '@/components/dashboard/subscription-panel';

export function SubscriptionClient() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <SubscriptionPanel />
      </div>
    </AuthGuard>
  );
}
