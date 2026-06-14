'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { useLazyGetDivarPostByCodeQuery } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type CodeSearchProps = {
  onSuccess?: () => void;
  variant?: 'desktop' | 'mobile';
  showLabel?: boolean;
};

export function CodeSearch({ onSuccess, variant = 'desktop', showLabel }: CodeSearchProps) {
  const t = useTranslations('header.search');
  const [codeValue, setCodeValue] = useState('');
  const [trigger, { isFetching }] = useLazyGetDivarPostByCodeQuery();

  const handleSearch = async () => {
    const numericCode = Number(codeValue.trim());
    if (!Number.isInteger(numericCode) || numericCode <= 0) {
      toast({ title: t('invalid') });
      return;
    }
    try {
      const result = await trigger(numericCode, true).unwrap();
      onSuccess?.();
      window.location.href = `/dashboard/posts/${result.id}`;
    } catch (error: unknown) {
      const maybeStatus = (error as { status?: number })?.status;
      if (maybeStatus === 404) {
        toast({ title: t('notFound'), variant: 'destructive' });
      } else if (maybeStatus === 429) {
        toast({ title: t('rateLimited'), variant: 'destructive' });
      } else {
        toast({ title: t('genericError'), variant: 'destructive' });
      }
    }
  };

  const labelContent = showLabel ? (
    <label className="block text-sm font-medium text-foreground">{t('label')}</label>
  ) : null;

  return (
    <div className={variant === 'desktop' ? 'hidden flex-col gap-1.5 sm:flex' : 'flex flex-col gap-1.5'}>
      {labelContent}
      <div className="flex">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={t('placeholder')}
        value={codeValue}
        onChange={(e) => setCodeValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
        className={
          variant === 'desktop'
            ? 'h-9 w-24 rounded-l-none rounded-r-sm text-sm shadow-none ring-0 focus-visible:ring-0 sm:w-28 lg:w-36'
            : 'h-10 w-full rounded-l-none rounded-r-sm text-sm shadow-none ring-0 focus-visible:ring-0'
        }
        aria-label={t('label')}
      />
      <Button
        type="button"
        size="sm"
        disabled={isFetching}
        onClick={handleSearch}
        className={cn(
          'rounded-l-sm rounded-r-none px-4',
          variant === 'desktop' ? 'h-9' : 'h-10',
        )}
      >
        <Search className="size-4" aria-hidden />
        <span className="sr-only">{t('button')}</span>
      </Button>
      </div>
    </div>
  );
}
