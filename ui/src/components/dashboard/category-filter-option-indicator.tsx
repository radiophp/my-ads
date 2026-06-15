'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type OptionIndicatorProps = {
  checked: boolean;
};

export function OptionIndicator({ checked }: OptionIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
      )}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </span>
  );
}
