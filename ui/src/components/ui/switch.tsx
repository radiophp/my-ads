import * as React from 'react';

import { cn } from '@/lib/utils';

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  dir?: 'ltr' | 'rtl';
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>;

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked = false, onCheckedChange, className, disabled, dir, ...props },
  ref,
) {
  const direction: 'ltr' | 'rtl' =
    dir ??
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr');

  const knobStyle: React.CSSProperties =
    direction === 'rtl'
      ? { right: checked ? '2px' : '18px' }
      : { left: checked ? '18px' : '2px' };

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
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
      {...props}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-[2px] inline-block size-5 rounded-full bg-background shadow transition-all"
          style={knobStyle}
        />
      </button>
  );
});
