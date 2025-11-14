'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowLeft, Circle } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  setProvince,
  setSelectedCities,
  setCitySelectionMode,
  setDistrictSelectionMode,
  setSelectedDistricts,
  setCategorySelection,
  setRingBinderFolder,
  setNoteFilter,
  type NoteFilterOption,
} from '@/features/search-filter/searchFilterSlice';
import {
  useGetProvincesQuery,
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useGetDivarCategoriesQuery,
  useGetRingBinderFoldersQuery,
} from '@/features/api/apiSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DivarCategory } from '@/types/divar-category';
import { CategoryFiltersPreview } from './category-filters-preview';

const BASE_CATEGORY_SLUG = 'real-estate';

export function DashboardSearchFilterPanel() {
  const t = useTranslations('dashboard.filters');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const dispatch = useAppDispatch();
  const {
    provinceId,
    citySelection,
    districtSelection,
    categorySelection,
    ringBinderFolderId,
    noteFilter,
  } = useAppSelector((state) => state.searchFilter);
  const categorySlug = categorySelection.slug;
  const categoryDepth = categorySelection.depth;
  const selectedCityIds =
    citySelection.mode === 'custom' && citySelection.cityIds.length > 0
      ? citySelection.cityIds
      : [];

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
  const {
    data: districts = [],
    isLoading: districtsLoading,
    isFetching: districtsFetching,
  } = useGetDistrictsQuery(
    selectedCityIds.length === 0
      ? skipToken
      : selectedCityIds.length === 1
        ? selectedCityIds[0]
        : selectedCityIds,
  );

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
  } = useGetDivarCategoriesQuery();

  const {
    data: ringBinderData,
    isLoading: ringBinderLoading,
    isFetching: ringBinderFetching,
  } = useGetRingBinderFoldersQuery();
  const ringBinderFolders = ringBinderData?.folders ?? [];

  const [provinceDialogOpen, setProvinceDialogOpen] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [draftProvinceId, setDraftProvinceId] = useState<number | null>(null);
  const [draftProvinceAll, setDraftProvinceAll] = useState(true);
  const [draftCityIds, setDraftCityIds] = useState<number[]>([]);
  const [draftAllCities, setDraftAllCities] = useState(true);
  const [draftDistrictIds, setDraftDistrictIds] = useState<number[]>([]);
  const [draftAllDistricts, setDraftAllDistricts] = useState(true);

  const isProvinceAll = provinceId === null;
  const isCityButtonDisabled =
    isProvinceAll || provincesLoading || provincesFetching || citiesLoading || citiesFetching;
  const categoriesBusy = categoriesLoading || categoriesFetching;
  const districtsBusy = districtsLoading || districtsFetching;

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
    if (
      districtSelection.mode !== 'custom' ||
      districtSelection.districtIds.length === 0 ||
      districts.length === 0
    ) {
      return;
    }
    const validIds = districtSelection.districtIds.filter((id) =>
      districts.some((district) => district.id === id),
    );
    if (validIds.length !== districtSelection.districtIds.length) {
      dispatch(setSelectedDistricts(validIds));
    }
  }, [districtSelection, districts, dispatch]);

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

  useEffect(() => {
    if (!districtDialogOpen) {
      return;
    }

    if (districtSelection.mode === 'all') {
      setDraftAllDistricts(true);
      setDraftDistrictIds([]);
    } else {
      setDraftAllDistricts(false);
      setDraftDistrictIds(districtSelection.districtIds);
    }
  }, [districtDialogOpen, districtSelection]);

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

  const multipleCitySelection = selectedCityIds.length > 1;

  const districtOptions = useMemo(
    () =>
      districts.map((district) => ({
        label: multipleCitySelection ? `${district.city} • ${district.name}` : district.name,
        value: district.id,
      })),
    [districts, multipleCitySelection],
  );

  const selectedCityNames = useMemo(() => {
    if (citySelection.mode !== 'custom' || citySelection.cityIds.length === 0) {
      return [];
    }

    return citySelection.cityIds
      .map((id) => cities.find((city) => city.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [citySelection, cities]);

  const selectedDistrictNames = useMemo(() => {
    if (districtSelection.mode !== 'custom' || districtSelection.districtIds.length === 0) {
      return [];
    }

    return districtSelection.districtIds
      .map((id) => {
        const match = districts.find((district) => district.id === id);
        if (!match) {
          return null;
        }
        return multipleCitySelection ? `${match.city} • ${match.name}` : match.name;
      })
      .filter((name): name is string => Boolean(name));
  }, [districtSelection, districts, multipleCitySelection]);

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

  const toggleDistrictSelection = (districtId: number) => {
    setDraftAllDistricts(false);
    setDraftDistrictIds((prev) =>
      prev.includes(districtId) ? prev.filter((id) => id !== districtId) : [...prev, districtId],
    );
  };

  const handleSelectAllDistricts = () => {
    setDraftAllDistricts(true);
    setDraftDistrictIds([]);
  };

  const applyCitySelection = () => {
    if (draftAllCities || draftCityIds.length === 0) {
      dispatch(setCitySelectionMode('all'));
    } else {
      dispatch(setSelectedCities(draftCityIds));
    }
    setCityDialogOpen(false);
  };

  const applyDistrictSelection = () => {
    if (draftAllDistricts || draftDistrictIds.length === 0) {
      dispatch(setDistrictSelectionMode('all'));
    } else {
      dispatch(setSelectedDistricts(draftDistrictIds));
    }
    setDistrictDialogOpen(false);
  };

  const selectedCityCount =
    citySelection.mode === 'custom' ? citySelection.cityIds.length : undefined;
  const selectedDistrictCount =
    districtSelection.mode === 'custom' ? districtSelection.districtIds.length : undefined;

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
  const isDistrictButtonDisabled =
    selectedCityIds.length === 0 || districtsBusy || districtOptions.length === 0;
  let districtButtonLabel = t('districtButtonSelect');
  if (!isDistrictButtonDisabled) {
    if (selectedDistrictNames.length === 1) {
      districtButtonLabel = selectedDistrictNames[0];
    } else if (selectedDistrictCount && selectedDistrictCount > 0) {
      districtButtonLabel = t('districtButtonSelected', { count: selectedDistrictCount });
    } else if (districtSelection.mode === 'all') {
      districtButtonLabel = t('districtAll');
    }
  }
  const districtHelperText =
    selectedCityIds.length === 0 ? t('districtDisabledHelper') : t('districtHelper');

  const allowedCategories = useMemo(
    () => categories.filter((category) => category.allowPosting),
    [categories],
  );

  const baseCategory = useMemo(
    () => allowedCategories.find((category) => category.slug === BASE_CATEGORY_SLUG) ?? null,
    [allowedCategories],
  );

  const visibleCategories = useMemo(() => {
    if (!baseCategory) {
      return allowedCategories;
    }
    const byParent = new Map<string | null, DivarCategory[]>();
    allowedCategories.forEach((category) => {
      const parentKey = category.parentId ?? null;
      if (!byParent.has(parentKey)) {
        byParent.set(parentKey, []);
      }
      byParent.get(parentKey)!.push(category);
    });
    byParent.forEach((list) =>
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    );
    const result: DivarCategory[] = [];
    const visit = (category: DivarCategory) => {
      result.push(category);
      const childList = byParent.get(category.id) ?? [];
      childList.forEach(visit);
    };
    visit(baseCategory);
    return result;
  }, [allowedCategories, baseCategory]);

  useEffect(() => {
    if (!categorySlug || categoriesBusy) {
      return;
    }
    const category = visibleCategories.find((item) => item.slug === categorySlug);
    if (!category) {
      dispatch(setCategorySelection({ slug: null, depth: null }));
    } else if (categoryDepth !== category.depth) {
      dispatch(setCategorySelection({ slug: category.slug, depth: category.depth }));
    }
  }, [visibleCategories, categoriesBusy, categorySlug, categoryDepth, dispatch]);

  const categoryStructures = useMemo(() => {
    const byId = new Map<string, DivarCategory>();
    visibleCategories.forEach((category) => {
      byId.set(category.id, category);
    });

    const children = new Map<string | null, DivarCategory[]>();
    visibleCategories.forEach((category) => {
      const parentKey =
        category.parentId && byId.has(category.parentId) ? category.parentId : null;
      if (!children.has(parentKey)) {
        children.set(parentKey, []);
      }
      children.get(parentKey)!.push(category);
    });

    children.forEach((list) =>
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    );

    return { byId, children };
  }, [visibleCategories]);

  const selectedCategory =
    categorySlug !== null
      ? visibleCategories.find((category) => category.slug === categorySlug) ?? null
      : null;

  const breadcrumbItems = useMemo(() => {
    if (baseCategory) {
      const crumbs: Array<{ slug: string | null; label: string; depth: number | null }> = [
        {
          slug: baseCategory.slug,
          label: baseCategory.name,
          depth: baseCategory.depth,
        },
      ];
      if (!selectedCategory || selectedCategory.id === baseCategory.id) {
        return crumbs;
      }
      const chain: DivarCategory[] = [];
      let current: DivarCategory | null | undefined = selectedCategory;
      while (current && current.id !== baseCategory.id) {
        chain.unshift(current);
        current =
          current.parentId && categoryStructures.byId.has(current.parentId)
            ? categoryStructures.byId.get(current.parentId)
            : null;
      }
      chain.forEach((category) => {
        if (category.id === baseCategory.id) {
          return;
        }
        crumbs.push({
          slug: category.slug,
          label: category.name,
          depth: category.depth,
        });
      });
      return crumbs;
    }

    const crumbs: Array<{ slug: string | null; label: string; depth: number | null }> = [
      { slug: null, label: t('categories.all'), depth: null },
    ];

    if (!selectedCategory) {
      return crumbs;
    }

    const chain: DivarCategory[] = [];
    let current: DivarCategory | null | undefined = selectedCategory;
    while (current) {
      chain.unshift(current);
      current =
        current.parentId && categoryStructures.byId.has(current.parentId)
          ? categoryStructures.byId.get(current.parentId)
          : null;
    }

    chain.forEach((category) => {
      crumbs.push({
        slug: category.slug,
        label: category.name,
        depth: category.depth,
      });
    });

    return crumbs;
  }, [baseCategory, selectedCategory, categoryStructures, t]);

  const categoryOptions = useMemo(() => {
    if (visibleCategories.length === 0) {
      return [];
    }

    if (selectedCategory) {
      const parentKey =
        selectedCategory.parentId && categoryStructures.byId.has(selectedCategory.parentId)
          ? selectedCategory.parentId
          : null;
      const children = categoryStructures.children.get(selectedCategory.id) ?? [];
      if (children.length > 0) {
        return children;
      }

      if (parentKey) {
        return categoryStructures.children.get(parentKey) ?? [];
      }
      if (baseCategory) {
        return categoryStructures.children.get(baseCategory.id) ?? [];
      }
      return categoryStructures.children.get(null) ?? [];
    }

    if (baseCategory) {
      return categoryStructures.children.get(baseCategory.id) ?? [];
    }

    return categoryStructures.children.get(null) ?? [];
  }, [visibleCategories, categoryStructures, selectedCategory, baseCategory]);

  const handleCategorySelect = (slug: string | null, depth: number | null = null) => {
    dispatch(setCategorySelection({ slug, depth }));
  };

  return (
    <section className="bg-card w-full rounded-xl border p-4 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {t('ringBinder.label')}
          </label>
          <select
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            value={ringBinderFolderId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              dispatch(setRingBinderFolder(value === '' ? null : value));
            }}
            disabled={ringBinderLoading || ringBinderFetching}
          >
            <option value="">{t('ringBinder.all')}</option>
            {ringBinderFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          {ringBinderLoading || ringBinderFetching ? (
            <p className="text-xs text-muted-foreground">{t('ringBinder.loading')}</p>
          ) : ringBinderFolders.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('ringBinder.empty')}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">{t('noteFilter.label')}</label>
          <select
            className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            value={noteFilter}
            onChange={(event) => {
              const value = event.target.value as NoteFilterOption;
              if (value === 'has' || value === 'none') {
                dispatch(setNoteFilter(value));
              } else {
                dispatch(setNoteFilter('all'));
              }
            }}
          >
            <option value="all">{t('noteFilter.options.all')}</option>
            <option value="has">{t('noteFilter.options.has')}</option>
            <option value="none">{t('noteFilter.options.none')}</option>
          </select>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t('categories.title')}</p>
          {categoriesBusy ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('categories.loading')}</p>
          ) : visibleCategories.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('categories.empty')}</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {breadcrumbItems.map((crumb, index) => {
                  const isActive =
                    crumb.slug === categorySlug ||
                    (!categorySlug && baseCategory && crumb.slug === baseCategory.slug);
                  return (
                    <div key={`${crumb.slug ?? 'root'}-${index}`} className="inline-flex items-center">
                      <button
                        type="button"
                        className={`rounded px-1 py-0.5 ${
                          isActive ? 'font-semibold text-foreground' : 'hover:text-foreground'
                        }`}
                        onClick={() => handleCategorySelect(crumb.slug, crumb.depth)}
                      >
                        {crumb.label}
                      </button>
                      {index < breadcrumbItems.length - 1 ? (
                        <span className="px-1 text-muted-foreground">{isRTL ? '«' : '»'}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <ul className="mt-3 flex flex-col gap-2 px-3" dir="ltr">
                {categoryOptions.map((category) => {
                  const isActive = category.slug === categorySlug;
                  return (
                    <li key={category.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        dir={isRTL ? 'rtl' : 'ltr'}
                        onClick={() => handleCategorySelect(category.slug, category.depth)}
                        className={`flex-1 text-xs transition ${
                          isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
                        } ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {category.name}
                      </button>
                      <Circle
                        aria-hidden="true"
                        className={`size-3 shrink-0 ${
                          isActive ? 'text-primary' : 'text-muted-foreground/70'
                        }`}
                        strokeWidth={3}
                        fill={isActive ? 'currentColor' : 'transparent'}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div>
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
                  className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6"
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
                    <div className="hidden p-0 sm:block">
                      <DialogHeader>
                        <DialogTitle>{t('provinceModalTitle')}</DialogTitle>
                        <DialogDescription>{t('provinceModalDescription')}</DialogDescription>
                      </DialogHeader>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 sm:p-0">
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
                  className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6"
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
                    <div className="hidden p-0 sm:block">
                      <DialogHeader>
                        <DialogTitle>{t('cityModalTitle')}</DialogTitle>
                        <DialogDescription>{t('cityModalDescription')}</DialogDescription>
                      </DialogHeader>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 sm:p-0">
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">{t('districtLabel')}</label>
              <Dialog open={districtDialogOpen} onOpenChange={setDistrictDialogOpen}>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between"
                  onClick={() => setDistrictDialogOpen(true)}
                  disabled={isDistrictButtonDisabled}
                >
                  {districtButtonLabel}
                </Button>
                <DialogContent
                  hideCloseButton
                  className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6"
                >
                  <div className="flex h-full flex-col overflow-hidden">
                    <div className="border-b border-border px-6 py-4 sm:hidden">
                      <div className="flex items-center gap-2" dir="ltr">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-sm font-medium text-primary"
                          onClick={() => setDistrictDialogOpen(false)}
                        >
                          <ArrowLeft className="size-4" />
                          {t('mobileBack')}
                        </button>
                        <p
                          className={`flex-1 text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}
                        >
                          {t('districtModalTitle')}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t('districtModalDescription')}</p>
                    </div>
                    <div className="hidden p-0 sm:block">
                      <DialogHeader>
                        <DialogTitle>{t('districtModalTitle')}</DialogTitle>
                        <DialogDescription>{t('districtModalDescription')}</DialogDescription>
                      </DialogHeader>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 sm:p-0">
                      <label className="flex items-center gap-3 rounded-lg border border-dashed border-input px-3 py-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          checked={draftAllDistricts}
                          onChange={handleSelectAllDistricts}
                        />
                        {t('districtModalSelectAll')}
                      </label>

                      <div className="rounded-xl border border-input">
                        {districtOptions.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">{t('districtModalEmpty')}</p>
                        ) : (
                          <ul className="divide-y divide-border">
                            {districtOptions.map((district) => (
                              <li key={district.value}>
                                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                                  <input
                                    type="checkbox"
                                    className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    checked={!draftAllDistricts && draftDistrictIds.includes(district.value)}
                                    onChange={() => toggleDistrictSelection(district.value)}
                                  />
                                  {district.label}
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                      <div className="flex flex-row justify-end gap-3">
                        <Button className="flex-1" type="button" onClick={applyDistrictSelection}>
                          {t('districtModalConfirm')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setDistrictDialogOpen(false)}
                        >
                          {t('districtModalCancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground">{districtHelperText}</p>
            </div>
            <CategoryFiltersPreview categorySlug={categorySlug} locale={locale} isRTL={isRTL} />
          </div>
        </div>
      </div>
    </section>
  );
}
