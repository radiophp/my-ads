import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  dir?: 'ltr' | 'rtl';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>;

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked = false, onCheckedChange, className, disabled, dir, ...props },
  ref,
) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      dir={dir}
      ref={ref}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'pointer-events-none absolute top-[2px] inline-block size-5 rounded-full bg-background shadow transition-all',
          'left-[2px] data-[state=checked]:left-[18px]',
          'rtl:left-auto rtl:right-[2px] rtl:data-[state=checked]:right-[18px]',
        )}
      />
    </button>
  );
});
