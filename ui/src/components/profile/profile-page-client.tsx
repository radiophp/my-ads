'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { ProfileForm } from '@/components/profile/profile-form';

export function ProfilePageClient() {
  return (
    <AuthGuard fallback={null}>
      <ProfileForm />
    </AuthGuard>
  );
}
