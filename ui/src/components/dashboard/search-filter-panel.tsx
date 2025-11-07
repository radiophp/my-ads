'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowLeft } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  setProvince,
  setSelectedCities,
  setCitySelectionMode,
} from '@/features/search-filter/searchFilterSlice';
import { useGetProvincesQuery, useGetCitiesQuery } from '@/features/api/apiSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function DashboardSearchFilterPanel() {
  const t = useTranslations('dashboard.filters');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const dispatch = useAppDispatch();
  const { provinceId, citySelection } = useAppSelector((state) => state.searchFilter);

  const {
    data: provinces = [],
    isLoading: provincesLoading,
    isFetching: provincesFetching,
  } = useGetProvincesQuery();

  const {
    data: cities = [],
    isLoading: citiesLoading,
    isFetching: citiesFetching,
  } = useGetCitiesQuery(provinceId === null ? skipToken : provinceId);

  const [provinceDialogOpen, setProvinceDialogOpen] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [draftProvinceId, setDraftProvinceId] = useState<number | null>(null);
  const [draftProvinceAll, setDraftProvinceAll] = useState(true);
  const [draftCityIds, setDraftCityIds] = useState<number[]>([]);
  const [draftAllCities, setDraftAllCities] = useState(true);

  const isProvinceAll = provinceId === null;
  const isCityButtonDisabled =
    isProvinceAll || provincesLoading || provincesFetching || citiesLoading || citiesFetching;

  useEffect(() => {
    if (provinceId === null) {
      return;
    }
    const provinceExists = provinces.some((province) => province.id === provinceId);
    if (!provinceExists && provinces.length > 0) {
      dispatch(setProvince(null));
    }
  }, [dispatch, provinceId, provinces]);

  useEffect(() => {
    if (
      citySelection.mode !== 'custom' ||
      citySelection.cityIds.length === 0 ||
      cities.length === 0
    ) {
      return;
    }
    const validIds = citySelection.cityIds.filter((id) => cities.some((city) => city.id === id));
    if (validIds.length !== citySelection.cityIds.length) {
      dispatch(setSelectedCities(validIds));
    }
  }, [citySelection, cities, dispatch]);

  useEffect(() => {
    if (!provinceDialogOpen) {
      return;
    }
    if (provinceId === null) {
      setDraftProvinceAll(true);
      setDraftProvinceId(null);
    } else {
      setDraftProvinceAll(false);
      setDraftProvinceId(provinceId);
    }
  }, [provinceDialogOpen, provinceId]);

  useEffect(() => {
    if (!cityDialogOpen) {
      return;
    }

    if (citySelection.mode === 'all') {
      setDraftAllCities(true);
      setDraftCityIds([]);
    } else {
      setDraftAllCities(false);
      setDraftCityIds(citySelection.cityIds);
    }
  }, [cityDialogOpen, citySelection]);

  const provinceOptions = useMemo(
    () =>
      provinces.map((province) => ({
        label: province.name,
        value: province.id,
      })),
    [provinces],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        label: city.name,
        value: city.id,
      })),
    [cities],
  );

  const selectedCityNames = useMemo(() => {
    if (citySelection.mode !== 'custom' || citySelection.cityIds.length === 0) {
      return [];
    }

    return citySelection.cityIds
      .map((id) => cities.find((city) => city.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [citySelection, cities]);

  const selectedProvinceName =
    provinceId !== null ? provinces.find((province) => province.id === provinceId)?.name : null;

  const provinceButtonLabel = provinceId === null ? t('provinceAll') : selectedProvinceName ?? t('provinceButtonSelect');

  const handleProvinceSelectAll = () => {
    setDraftProvinceAll(true);
    setDraftProvinceId(null);
  };

  const handleProvincePick = (id: number) => {
    setDraftProvinceAll(false);
    setDraftProvinceId(id);
  };

  const applyProvinceSelection = () => {
    if (draftProvinceAll || draftProvinceId === null) {
      dispatch(setProvince(null));
    } else {
      dispatch(setProvince(draftProvinceId));
    }
    setProvinceDialogOpen(false);
  };

  const toggleCitySelection = (cityId: number) => {
    setDraftAllCities(false);
    setDraftCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId],
    );
  };

  const handleSelectAllCities = () => {
    setDraftAllCities(true);
    setDraftCityIds([]);
  };

  const applyCitySelection = () => {
    if (draftAllCities || draftCityIds.length === 0) {
      dispatch(setCitySelectionMode('all'));
    } else {
      dispatch(setSelectedCities(draftCityIds));
    }
    setCityDialogOpen(false);
  };

  const selectedCityCount =
    citySelection.mode === 'custom' ? citySelection.cityIds.length : undefined;

  let cityButtonLabel = isProvinceAll ? t('cityAll') : t('cityButtonSelect');
  if (!isProvinceAll) {
    if (selectedCityNames.length === 1) {
      cityButtonLabel = selectedCityNames[0];
    } else if (selectedCityCount && selectedCityCount > 0) {
      cityButtonLabel = t('cityButtonSelected', { count: selectedCityCount });
    } else if (citySelection.mode === 'all') {
      cityButtonLabel = t('cityAll');
    }
  }

  const cityHelperText = isProvinceAll ? t('cityDisabledHelper') : t('cityHelper');

  return (
    <section className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{t('title')}</p>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">{t('provinceLabel')}</label>
          <Dialog open={provinceDialogOpen} onOpenChange={setProvinceDialogOpen}>
            <Button
              type="button"
              variant="outline"
              className="justify-between"
              onClick={() => setProvinceDialogOpen(true)}
              disabled={provincesLoading && provinces.length === 0}
            >
              {provinceButtonLabel}
            </Button>
            <DialogContent
              hideCloseButton
              className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6 sm:pb-6"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-border px-6 py-4 sm:hidden">
                  <div className="flex items-center gap-2" dir="ltr">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-primary"
                      onClick={() => setProvinceDialogOpen(false)}
                    >
                      <ArrowLeft className="size-4" />
                      {t('mobileBack')}
                    </button>
                    <p
                      className={`flex-1 text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      {t('provinceModalTitle')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t('provinceModalDescription')}</p>
                </div>
                <div className="hidden px-0 py-0 sm:block">
                  <DialogHeader>
                    <DialogTitle>{t('provinceModalTitle')}</DialogTitle>
                    <DialogDescription>{t('provinceModalDescription')}</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 sm:px-0 sm:py-0">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-3 py-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="province-modal-option"
                      className="size-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      checked={draftProvinceAll}
                      onChange={handleProvinceSelectAll}
                    />
                    {t('provinceModalSelectAll')}
                  </label>

                  <div className="rounded-xl border border-input">
                    {provinceOptions.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">{t('provinceModalEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {provinceOptions.map((province) => (
                          <li key={province.value}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                              <input
                                type="radio"
                                name="province-modal-option"
                                className="size-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                checked={!draftProvinceAll && draftProvinceId === province.value}
                                onChange={() => handleProvincePick(province.value)}
                              />
                              {province.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                  <div className="flex flex-row justify-end gap-3">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={applyProvinceSelection}
                      disabled={!draftProvinceAll && draftProvinceId === null}
                    >
                      {t('provinceModalConfirm')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setProvinceDialogOpen(false)}
                    >
                      {t('provinceModalCancel')}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">{t('cityLabel')}</label>
          <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
            <Button
              type="button"
              variant="outline"
              className="justify-between"
              onClick={() => setCityDialogOpen(true)}
              disabled={isCityButtonDisabled}
            >
              {cityButtonLabel}
            </Button>
            <DialogContent
              hideCloseButton
              className="left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6 sm:pb-6"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-border px-6 py-4 sm:hidden">
                  <div className="flex items-center gap-2" dir="ltr">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-primary"
                      onClick={() => setCityDialogOpen(false)}
                    >
                      <ArrowLeft className="size-4" />
                      {t('mobileBack')}
                    </button>
                    <p
                      className={`flex-1 text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      {t('cityModalTitle')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t('cityModalDescription')}</p>
                </div>
                <div className="hidden px-0 py-0 sm:block">
                  <DialogHeader>
                    <DialogTitle>{t('cityModalTitle')}</DialogTitle>
                    <DialogDescription>{t('cityModalDescription')}</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 sm:px-0 sm:py-0">
                  <label className="flex items-center gap-3 rounded-lg border border-dashed border-input px-3 py-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      checked={draftAllCities}
                      onChange={handleSelectAllCities}
                    />
                    {t('cityModalSelectAll')}
                  </label>

                  <div className="rounded-xl border border-input">
                    {cityOptions.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">{t('cityModalEmpty')}</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {cityOptions.map((city) => (
                          <li key={city.value}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                checked={!draftAllCities && draftCityIds.includes(city.value)}
                                onChange={() => toggleCitySelection(city.value)}
                              />
                              {city.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                  <div className="flex flex-row justify-end gap-3">
                    <Button className="flex-1" type="button" onClick={applyCitySelection}>
                      {t('cityModalConfirm')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCityDialogOpen(false)}
                    >
                      {t('cityModalCancel')}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground">{cityHelperText}</p>
        </div>
      </div>
    </section>
  );
}
