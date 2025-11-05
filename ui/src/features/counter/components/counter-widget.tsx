'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { decrement, increment, reset } from '../counterSlice';

export function CounterWidget(): JSX.Element {
  const value = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();
  const t = useTranslations('counter');

  return (
    <Card className="bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <span className="text-3xl font-semibold" data-testid="counter-value">
          {value}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => dispatch(decrement())} aria-label={t('buttons.decrement')}>
            -1
          </Button>
          <Button onClick={() => dispatch(increment())} aria-label={t('buttons.increment')}>
            +1
          </Button>
          <Button variant="ghost" onClick={() => dispatch(reset())} aria-label={t('buttons.reset')}>
            {t('buttons.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
