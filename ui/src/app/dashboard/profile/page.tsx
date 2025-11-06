import type { JSX } from 'react';
import { unstable_setRequestLocale } from 'next-intl/server';

import { defaultLocale } from '@/i18n/config';
import { ProfilePageClient } from '@/components/profile/profile-page-client';

export default function ProfilePage(): JSX.Element {
  unstable_setRequestLocale(defaultLocale);
  return <ProfilePageClient />;
}
