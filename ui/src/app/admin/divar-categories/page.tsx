import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminDivarCategoriesClient } from '@/components/admin/admin-divar-categories-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminDivarCategoriesPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminDivarCategoriesClient />;
}
