'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { useLazyGetDivarPostByCodeQuery } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

type CodeSearchProps = {
  onSuccess?: () => void;
  variant?: 'desktop' | 'mobile';
};

export function CodeSearch({ onSuccess, variant = 'desktop' }: CodeSearchProps) {
  const t = useTranslations('header.search');
  const router = useRouter();
  const [codeValue, setCodeValue] = useState('');
  const [trigger, { isFetching }] = useLazyGetDivarPostByCodeQuery();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericCode = Number(codeValue.trim());
    if (!Number.isInteger(numericCode) || numericCode <= 0) {
      toast({ title: t('invalid') });
      return;
    }
    try {
      const result = await trigger(numericCode, true).unwrap();
      router.push(`/dashboard/posts/${result.id}`);
      onSuccess?.();
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

  return (
    <form
      onSubmit={handleSubmit}
      className={variant === 'desktop' ? 'hidden sm:flex' : 'flex'}
    >
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={t('placeholder')}
        value={codeValue}
        onChange={(e) => setCodeValue(e.target.value)}
        className="h-9 w-40 rounded-l-none rounded-r-sm text-sm shadow-none ring-0 focus-visible:ring-0 sm:w-44"
        aria-label={t('label')}
      />
      <Button
        type="submit"
        size="sm"
        disabled={isFetching}
        className="h-9 rounded-l-sm rounded-r-none px-2"
      >
        <Search className="size-4" aria-hidden />
        <span className="sr-only">{t('button')}</span>
      </Button>
    </form>
  );
}
