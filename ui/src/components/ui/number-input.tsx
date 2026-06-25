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
    <div className={`flex items-center ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-s-none border-s-0"
        onClick={increment}
        disabled={disabled || value >= max}
      >
        <Plus className="size-3" />
      </Button>
      <div className="flex h-7 w-14 items-center justify-center border-y bg-background text-xs tabular-nums text-foreground">
        {value}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 rounded-e-none border-e-0"
        onClick={decrement}
        disabled={disabled || value <= min}
      >
        <Minus className="size-3" />
      </Button>
    </div>
  );
}
