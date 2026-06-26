'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type NumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
};

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className = '',
  disabled = false,
}: NumberInputProps) {
  const decrement = () => {
    const next = value - step;
    if (next >= min) onChange(next);
  };

  const increment = () => {
    const next = value + step;
    if (next <= max) onChange(next);
  };

  return (
    <div className={`flex w-full items-center ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0 rounded-e-none border-e-0"
        onClick={decrement}
        disabled={disabled || value <= min}
      >
        <Minus className="size-4" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          const raw = e.target.value.replace(/[^0-9]/g, '');
          if (raw === '') {
            onChange(min);
            return;
          }
          const next = Number(raw);
          if (next <= max) onChange(next);
        }}
        onBlur={() => {
          if (value < min) onChange(min);
          if (value > max) onChange(max);
        }}
        className="flex h-9 min-w-0 flex-1 items-center justify-center border-y bg-background text-center text-sm tabular-nums text-foreground outline-none [appearance:textfield] disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0 rounded-s-none border-s-0"
        onClick={increment}
        disabled={disabled || value >= max}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
