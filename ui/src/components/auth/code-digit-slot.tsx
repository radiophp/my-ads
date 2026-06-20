'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { CODE_LENGTH } from '@/lib/phone-utils';

type CodeDigitSlotProps = {
  index: number;
  code: string;
  disabled: boolean;
  onInput: (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRef: (index: number, element: HTMLInputElement | null) => void;
};

export function CodeDigitSlot({ index, code, disabled, onInput, onKeyDown, onRef }: CodeDigitSlotProps) {
  const t = useTranslations('landing.login');
  const digit = code[index] ?? '';
  return (
    <div className="flex items-center">
      <Input
        id={index === 0 ? 'code' : undefined}
        name="code"
        type="password"
        inputMode="numeric"
        autoComplete={index === 0 ? 'one-time-code' : 'off'}
        aria-label={t('codeDigitAria')}
        value={digit}
        onChange={onInput(index)}
        onKeyDown={onKeyDown(index)}
        disabled={disabled}
        required
        className="size-12 p-0 text-center text-lg font-semibold"
        ref={(element) => {
          onRef(index, element);
        }}
      />
      {index < CODE_LENGTH - 1 ? (
        <span className="mx-2 text-sm text-muted-foreground">-</span>
      ) : null}
    </div>
  );
}
