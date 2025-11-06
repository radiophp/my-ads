'use client';

import type { JSX } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { ProfileForm } from '@/components/profile/profile-form';

export function ProfilePageClient(): JSX.Element {
  return (
    <AuthGuard fallback={null}>
      <ProfileForm />
    </AuthGuard>
  );
}
