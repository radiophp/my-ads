'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetFeatureBasePricesQuery,
  useUpdateFeatureBasePriceMutation,
} from '@/features/api/endpoints/feature-base-prices';
import type { FeatureBasePrice } from '@/types/feature-base-prices';

function formatDelimited(value: string): string {
  const parts = value.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let result = '';
  if (h > 0) result += HUNDREDS[h];
  const remainder = n % 100;
  if (remainder === 0) return result;
  if (result) result += ' و ';
  if (remainder < 10) {
    result += ONES[remainder];
  } else if (remainder < 20) {
    result += TEENS[remainder - 10];
  } else {
    if (t > 0) result += TENS[t];
    if (o > 0) result += ' و ' + ONES[o];
  }
  return result;
}

function numberToPersianWords(num: number): string {
  if (num === 0) return 'صفر';
  const groups: string[] = [];
  const GRADES = ['', 'هزار', 'میلیون', 'میلیارد'];
  let remaining = Math.floor(num);
  let grade = 0;
  while (remaining > 0) {
    const part = remaining % 1000;
    if (part > 0) {
      const words = threeDigitWords(part);
      groups.unshift(words + (GRADES[grade] ? ' ' + GRADES[grade] : ''));
    }
    remaining = Math.floor(remaining / 1000);
    grade++;
  }
  return groups.join(' و ');
}

function PriceHint({ raw }: { raw: string }) {
  const cleaned = raw.replace(/[^0-9]/g, '');
  const rial = parseInt(cleaned, 10);
  if (isNaN(rial)) return null;
  const toman = Math.floor(rial / 10);
  const words = numberToPersianWords(toman);

  return (
    <div className="text-[11px] leading-tight text-muted-foreground px-0.5">
      <span className="text-[10px]">{words} تومان</span>
    </div>
  );
}

export function AdminFeatureBasePricesManager() {
  const t = useTranslations('admin.featureBasePrices');
  const { toast } = useToast();

  const { data: prices = [], isFetching, isLoading } = useGetFeatureBasePricesQuery();
  const [updatePrice] = useUpdateFeatureBasePriceMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (prices.length > 0) {
      setDraftPrices((prev) => {
        const next = { ...prev };
        for (const p of prices) {
          if (!(p.id in next)) {
            next[p.id] = p.unitPrice;
          }
        }
        return next;
      });
    }
  }, [prices]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPrices = useMemo(() => {
    if (!normalizedSearch) return prices;
    return prices.filter(
      (p) =>
        p.title.toLowerCase().includes(normalizedSearch) ||
        p.featureKey.toLowerCase().includes(normalizedSearch),
    );
  }, [prices, normalizedSearch]);

  const handleSave = useCallback(
    async (price: FeatureBasePrice) => {
      const raw = draftPrices[price.id] ?? price.unitPrice;
      const parsed = Number.parseFloat(raw);
      if (Number.isNaN(parsed) || parsed < 0) {
        toast({ title: t('toast.invalidPrice'), variant: 'destructive' });
        return;
      }
      try {
        setSavingId(price.id);
        await updatePrice({ id: price.id, body: { unitPrice: parsed } }).unwrap();
      } catch (error) {
        console.error('Failed to update feature base price', error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorDescription'),
          variant: 'destructive',
        });
      } finally {
        setSavingId(null);
      }
    },
    [draftPrices, toast, t, updatePrice],
  );

  const handleToggleActive = useCallback(
    async (price: FeatureBasePrice) => {
      try {
        await updatePrice({ id: price.id, body: { isActive: !price.isActive } }).unwrap();
      } catch (error) {
        console.error('Failed to toggle feature base price', error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorDescription'),
          variant: 'destructive',
        });
      }
    },
    [t, toast, updatePrice],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-right font-medium">{t('columns.featureKey')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.title')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.type')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.limitType')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.pricing')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.unitPrice')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.unitLabel')}</th>
                  <th className="pb-2 text-right font-medium">{t('columns.active')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((price) => {
                  const isSaving = savingId === price.id;

                  return (
                    <tr key={price.id} className="border-b last:border-b-0 hover:bg-muted/50">
                      <td className="py-2.5 text-right font-mono text-xs">{price.featureKey}</td>
                      <td className="py-2.5 text-right">{price.title}</td>
                      <td className="py-2.5 text-right">
                        {price.pricingType === 'PER_UNIT' ? t('perUnit') : t('flatAccess')}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {price.limitType === 'DAILY' ? t('daily') : price.limitType === 'OVERALL' ? t('overall') : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {price.isPermanent ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400">{t('permanent')}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('subscription')}</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right align-top">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center rounded-md border w-full">
                            <Input
                              type="text"
                              inputMode="decimal"
                              min="0"
                              value={formatDelimited(draftPrices[price.id] ?? price.unitPrice)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.]/g, '');
                                setDraftPrices((prev) => ({ ...prev, [price.id]: raw }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSave(price);
                                }
                              }}
                              className="h-8 flex-1 border-0 text-right"
                              disabled={isSaving}
                            />
                            <div className="flex items-center px-1.5 h-8 text-[11px] text-muted-foreground border-l bg-muted/50 shrink-0">
                              ریال
                            </div>
                            <Button
                              variant="ghost"
                              className="shrink-0 rounded-none px-2 h-8 gap-1 text-xs"
                              onClick={() => handleSave(price)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="size-4 text-green-600" />
                                  <span>{t('save')}</span>
                                </>
                              )}
                            </Button>
                          </div>
                          <PriceHint raw={draftPrices[price.id] ?? price.unitPrice} />
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{price.unitLabel ?? '—'}</td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-2 [direction:ltr]">
                          <Label className="text-xs text-muted-foreground">
                            {price.isActive ? t('active') : t('inactive')}
                          </Label>
                          <Switch
                            checked={price.isActive}
                            onCheckedChange={() => handleToggleActive(price)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPrices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {t('empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {isFetching && !isLoading && (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
