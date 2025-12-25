'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function PathnameSync() {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    document.body.dataset.pathname = pathname;
  }, [pathname]);

  return null;
}
