'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { PaymentsManager } from '@/components/dashboard/payments-manager';

export function PaymentsClient() {
  return (
    <AuthGuard>
      <PaymentsManager />
    </AuthGuard>
  );
}
