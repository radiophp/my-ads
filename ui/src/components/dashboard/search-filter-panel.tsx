'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Filter,
  Folder,
  X,
} from 'lucide-react';

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
  resetSearchFilter,
  searchFilterInitialState,
  hydrateFromSaved,
  commitAppliedFilters,
  type SearchFilterState,
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
import { Input } from '@/components/ui/input';
import type { DivarCategory } from '@/types/divar-category';
import { CategoryFiltersPreview } from './category-filters-preview';
import { useBackButtonClose } from '@/hooks/use-back-button-close';
import { CategorySelectionModal } from './category-selection-modal';
import { cn } from '@/lib/utils';
import {
  useGetSavedFiltersQuery,
  useCreateSavedFilterMutation,
} from '@/features/api/apiSlice';
import type { SavedFilter } from '@/types/saved-filters';
import { SaveFilterDialog } from '@/components/dashboard/save-filter-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cloneSearchFilterState, mergeSavedFilterState } from '@/features/search-filter/utils';
import { DesktopCategorySection } from './desktop-category-section';
import { DesktopRegionSelectors } from './desktop-region-selectors';

const BASE_CATEGORY_SLUG = 'real-estate';
const DEFAULT_SAVED_FILTER_LIMIT = 5;
const DEFAULT_PROVINCE_NAME_FA = 'البرز';

type SelectionIndicatorProps = {
  type: 'radio' | 'checkbox';
  checked: boolean;
};

function SelectionIndicator({ type, checked }: SelectionIndicatorProps) {
  if (type === 'checkbox') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-sm border',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
        )}
      >
        {checked ? <Check className="size-3.5" /> : null}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border bg-background',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
      )}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </span>
  );
}

export function DashboardSearchFilterPanel() {
  const t = useTranslations('dashboard.filters');
  const savedFiltersT = useTranslations('dashboard.filters.saved');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const dispatch = useAppDispatch();
  const {
    provinceId,
    citySelection,
    districtSelection,
    categorySelection,
    categoryFilters,
    ringBinderFolderId,
    noteFilter,
    persistNonce,
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

  const defaultProvinceAppliedRef = useRef(false);

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

  const { toast } = useToast();
  const {
    data: savedFiltersData,
    isLoading: savedFiltersLoading,
    isFetching: savedFiltersFetching,
  } = useGetSavedFiltersQuery();
  const [createSavedFilter, { isLoading: isCreatingSavedFilter }] = useCreateSavedFilterMutation();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [savedFiltersModalOpen, setSavedFiltersModalOpen] = useState(false);

  const [provinceDialogOpen, setProvinceDialogOpen] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [draftProvinceId, setDraftProvinceId] = useState<number | null>(null);
  const [draftProvinceAll, setDraftProvinceAll] = useState(true);
  const [draftCityIds, setDraftCityIds] = useState<number[]>([]);
  const [draftAllCities, setDraftAllCities] = useState(true);
  const [draftDistrictIds, setDraftDistrictIds] = useState<number[]>([]);
  const [draftAllDistricts, setDraftAllDistricts] = useState(true);
  const [desktopDialogContext, setDesktopDialogContext] = useState<'none' | 'province' | 'city' | 'district'>('none');
  const [provinceQuery, setProvinceQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');

  const handleProvinceDialogChange = (open: boolean) => {
    setProvinceDialogOpen(open);
    if (!open && desktopDialogContext === 'province') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
      setProvinceQuery('');
    }
  };

  const handleCityDialogChange = (open: boolean) => {
    setCityDialogOpen(open);
    if (!open && desktopDialogContext === 'city') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
      setCityQuery('');
    }
  };

  const handleDistrictDialogChange = (open: boolean) => {
    setDistrictDialogOpen(open);
    if (!open && desktopDialogContext === 'district') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
      setDistrictQuery('');
    }
  };

  const isProvinceAll = provinceId === null;
  const isCityButtonDisabled =
    isProvinceAll || provincesLoading || provincesFetching || citiesLoading || citiesFetching;
  const categoriesBusy = categoriesLoading || categoriesFetching;
  const districtsBusy = districtsLoading || districtsFetching;

  useEffect(() => {
    if (defaultProvinceAppliedRef.current) {
      return;
    }
    if (filterModalOpen) {
      return;
    }
    if (persistNonce !== 0) {
      return;
    }
    if (provincesLoading || provincesFetching) {
      return;
    }
    if (provinceId !== null) {
      return;
    }
    const match = provinces.find((province) => province.name === DEFAULT_PROVINCE_NAME_FA);
    if (!match) {
      defaultProvinceAppliedRef.current = true;
      return;
    }
    defaultProvinceAppliedRef.current = true;
    dispatch(setProvince(match.id));
  }, [dispatch, filterModalOpen, persistNonce, provinceId, provinces, provincesFetching, provincesLoading]);

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

  const provinceOptions = useMemo(() => {
    const normalized = provinceQuery.trim().toLowerCase();
    const list = provinces.map((province) => ({
      label: province.name,
      value: province.id,
      slug: province.slug?.toLowerCase?.() ?? '',
    }));
    if (!normalized) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.slug.includes(normalized) ||
        (!draftProvinceAll && draftProvinceId === item.value),
    );
  }, [provinces, provinceQuery, draftProvinceAll, draftProvinceId]);

  const cityOptions = useMemo(() => {
    const normalized = cityQuery.trim().toLowerCase();
    const list = cities.map((city) => ({
      label: city.name,
      value: city.id,
      slug: city.slug?.toLowerCase?.() ?? '',
    }));
    if (!normalized) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.slug.includes(normalized) ||
        (!draftAllCities && draftCityIds.includes(item.value)),
    );
  }, [cities, cityQuery, draftAllCities, draftCityIds]);

  const multipleCitySelection = selectedCityIds.length > 1;

  const districtOptions = useMemo(() => {
    const normalized = districtQuery.trim().toLowerCase();
    const list = districts.map((district) => ({
      label: multipleCitySelection ? `${district.city} • ${district.name}` : district.name,
      value: district.id,
      slug: district.slug?.toLowerCase?.() ?? '',
    }));
    if (!normalized) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.slug.includes(normalized) ||
        (!draftAllDistricts && draftDistrictIds.includes(item.value)),
    );
  }, [districts, multipleCitySelection, districtQuery, draftAllDistricts, draftDistrictIds]);

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
    setProvinceQuery('');
  };

  const handleProvincePick = (id: number) => {
    setDraftProvinceAll(false);
    setDraftProvinceId(id);
    setProvinceQuery('');
  };

  const applyProvinceSelection = () => {
    if (draftProvinceAll || draftProvinceId === null) {
      dispatch(setProvince(null));
    } else {
      dispatch(setProvince(draftProvinceId));
    }
    setProvinceDialogOpen(false);
    if (desktopDialogContext === 'province') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
    }
  };

  const toggleCitySelection = (cityId: number) => {
    setDraftAllCities(false);
    setDraftCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId],
    );
    setCityQuery('');
  };

  const handleSelectAllCities = () => {
    setDraftAllCities(true);
    setDraftCityIds([]);
    setCityQuery('');
  };

  const toggleDistrictSelection = (districtId: number) => {
    setDraftAllDistricts(false);
    setDraftDistrictIds((prev) =>
      prev.includes(districtId) ? prev.filter((id) => id !== districtId) : [...prev, districtId],
    );
    setDistrictQuery('');
  };

  const handleSelectAllDistricts = () => {
    setDraftAllDistricts(true);
    setDraftDistrictIds([]);
    setDistrictQuery('');
  };

  const applyCitySelection = () => {
    if (draftAllCities || draftCityIds.length === 0) {
      dispatch(setCitySelectionMode('all'));
    } else {
      dispatch(setSelectedCities(draftCityIds));
    }
    setCityDialogOpen(false);
    if (desktopDialogContext === 'city') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
    }
  };

  const applyDistrictSelection = () => {
    if (draftAllDistricts || draftDistrictIds.length === 0) {
      dispatch(setDistrictSelectionMode('all'));
    } else {
      dispatch(setSelectedDistricts(draftDistrictIds));
    }
    setDistrictDialogOpen(false);
    if (desktopDialogContext === 'district') {
      setDesktopDialogContext('none');
      setFilterModalOpen(false);
    }
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
  const showCityFilter = !isProvinceAll;
  const showDistrictFilter = !isProvinceAll && selectedCityIds.length > 0;

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
  const [mobileFiltersTab, setMobileFiltersTab] = useState<'main' | 'category' | 'personalize'>(
    'main',
  );
  const [mobileTabDirection, setMobileTabDirection] = useState<1 | -1>(1);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  useBackButtonClose(filterModalOpen, () => setFilterModalOpen(false));

  useEffect(() => {
    if (!filterModalOpen && categoryModalOpen) {
      setCategoryModalOpen(false);
    }
  }, [filterModalOpen, categoryModalOpen]);

  useEffect(() => {
    if (filterModalOpen) {
      setMobileFiltersTab('main');
      setMobileTabDirection(1);
    }
  }, [filterModalOpen]);

  useEffect(() => {
    if (!filterModalOpen) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overscrollBody: body.style.overscrollBehaviorY,
      overscrollHtml: html.style.overscrollBehaviorY,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehaviorY = 'none';
    html.style.overscrollBehaviorY = 'none';

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overscrollBehaviorY = prev.overscrollBody;
      html.style.overscrollBehaviorY = prev.overscrollHtml;
      window.scrollTo(0, scrollY);
    };
  }, [filterModalOpen]);

  const mobileTabKeys = useMemo(() => ['main', 'category', 'personalize'] as const, []);
  const mobileTabIndex = useMemo(() => mobileTabKeys.indexOf(mobileFiltersTab), [mobileTabKeys, mobileFiltersTab]);

  const setMobileTab = useCallback(
    (nextTab: (typeof mobileTabKeys)[number]) => {
      if (nextTab === mobileFiltersTab) {
        return;
      }
      const nextIndex = mobileTabKeys.indexOf(nextTab);
      setMobileTabDirection(nextIndex > mobileTabIndex ? 1 : -1);
      setMobileFiltersTab(nextTab);
    },
    [mobileTabIndex, mobileTabKeys, mobileFiltersTab],
  );

  const handleMobileTabSwipe = useCallback(
    (direction: 1 | -1) => {
      const nextIndex = mobileTabIndex + direction;
      if (nextIndex < 0 || nextIndex >= mobileTabKeys.length) {
        return;
      }
      setMobileTabDirection(direction);
      setMobileFiltersTab(mobileTabKeys[nextIndex]);
    },
    [mobileTabIndex, mobileTabKeys],
  );

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

  const categorySummaryLabel =
    selectedCategory?.name ?? baseCategory?.name ?? t('categories.all');

  const handleOpenCategoryModal = () => setCategoryModalOpen(true);

  const handleCategorySelect = (slug: string | null, depth: number | null = null) => {
    dispatch(setCategorySelection({ slug, depth }));
  };

  const handleResetFilters = () => {
    dispatch(resetSearchFilter());
    setProvinceDialogOpen(false);
    setCityDialogOpen(false);
    setDistrictDialogOpen(false);
  };

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        provinceId,
        citySelection,
        districtSelection,
        categorySelection,
        categoryFilters,
        ringBinderFolderId,
        noteFilter,
      }),
    [
      provinceId,
      citySelection,
      districtSelection,
      categorySelection,
      categoryFilters,
      ringBinderFolderId,
      noteFilter,
    ],
  );

  const [modalBaselineSignature, setModalBaselineSignature] = useState<string | null>(null);

  useEffect(() => {
    if (filterModalOpen) {
      setModalBaselineSignature((prev) => (prev === null ? filterSignature : prev));
    } else if (modalBaselineSignature !== null) {
      setModalBaselineSignature(null);
    }
  }, [filterModalOpen, filterSignature, modalBaselineSignature]);

  const modalHasPendingChanges =
    modalBaselineSignature !== null && filterSignature !== modalBaselineSignature;

  const hasActiveFilters = useMemo(() => {
    if (provinceId !== searchFilterInitialState.provinceId) {
      return true;
    }
    if (
      citySelection.mode !== searchFilterInitialState.citySelection.mode ||
      citySelection.cityIds.length > 0
    ) {
      return true;
    }
    if (
      districtSelection.mode !== searchFilterInitialState.districtSelection.mode ||
      districtSelection.districtIds.length > 0
    ) {
      return true;
    }
    if (categorySelection.slug !== searchFilterInitialState.categorySelection.slug) {
      return true;
    }
    if (Object.keys(categoryFilters).length > 0) {
      return true;
    }
    if (ringBinderFolderId !== searchFilterInitialState.ringBinderFolderId) {
      return true;
    }
    if (noteFilter !== searchFilterInitialState.noteFilter) {
      return true;
    }
    return false;
  }, [
    provinceId,
    citySelection,
    districtSelection,
    categorySelection,
    categoryFilters,
    ringBinderFolderId,
    noteFilter,
  ]);

  const currentFilterState = useMemo<SearchFilterState>(
    () => ({
      provinceId,
      citySelection,
      districtSelection,
      categorySelection,
      categoryFilters,
      ringBinderFolderId,
      noteFilter,
    }),
    [
      provinceId,
      citySelection,
      districtSelection,
      categorySelection,
      categoryFilters,
      ringBinderFolderId,
      noteFilter,
    ],
  );

  const savedFilters = savedFiltersData?.filters ?? [];
  const savedFiltersLimit = savedFiltersData?.limit ?? DEFAULT_SAVED_FILTER_LIMIT;
  const savedFiltersRemaining =
    savedFiltersData?.remaining ?? Math.max(savedFiltersLimit - savedFilters.length, 0);
  const savedFiltersBusy = savedFiltersLoading || savedFiltersFetching;
  const saveLimitReached = savedFiltersRemaining <= 0;
  const totalSavedFilters = savedFilters.length;

  const handleApplySavedFilter = useCallback(
    (filter: SavedFilter) => {
      const normalized = mergeSavedFilterState(filter.payload);
      dispatch(hydrateFromSaved(normalized));
      dispatch(commitAppliedFilters());
      toast({
        title: savedFiltersT('toast.appliedTitle'),
        description: savedFiltersT('toast.appliedDescription', { name: filter.name }),
      });
      if (filterModalOpen) {
        setFilterModalOpen(false);
      }
    },
    [dispatch, filterModalOpen, savedFiltersT, toast],
  );

  const handleSaveFilter = useCallback(
    async (name: string) => {
      try {
        const payload = cloneSearchFilterState(currentFilterState);
        await createSavedFilter({ name, payload }).unwrap();
        toast({
          title: savedFiltersT('toast.savedTitle'),
          description: savedFiltersT('toast.savedDescription'),
        });
        setSaveDialogOpen(false);
      } catch (error) {
        console.error('Failed to save filter', error);
        toast({
          title: savedFiltersT('toast.errorTitle'),
          description: savedFiltersT('toast.errorDescription'),
          variant: 'destructive',
        });
      }
    },
    [createSavedFilter, currentFilterState, savedFiltersT, toast],
  );

  return (
    <>
      <div
        className={cn(
          'lg:hidden',
          filterModalOpen
            ? 'hidden'
            : 'pointer-events-none fixed bottom-4 left-4 z-40 drop-shadow-lg md:bottom-20 md:left-1/2 md:-translate-x-1/2 md:drop-shadow-2xl',
        )}
      >
        <div className="pointer-events-auto flex flex-col gap-3 md:flex-row">
          <Button
            type="button"
            variant={hasActiveFilters ? 'default' : 'secondary'}
            className={cn(
              'rounded-full px-4 py-2',
              hasActiveFilters ? 'shadow-lg' : 'shadow',
              'md:gap-4 md:px-14 md:py-7 md:text-xl',
            )}
            onClick={() => setFilterModalOpen(true)}
          >
            <span className="flex items-center justify-center gap-2">
              {isRTL ? (
                <>
                  <span>{hasActiveFilters ? t('editFilters') : t('title')}</span>
                  <Filter className="size-4" />
                </>
              ) : (
                <>
                  <Filter className="size-4" />
                  <span>{hasActiveFilters ? t('editFilters') : t('title')}</span>
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
      {filterModalOpen ? (
        <button
          type="button"
          aria-label={t('mobileBack')}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setFilterModalOpen(false)}
        />
      ) : null}
	      <section
	        className={cn(
	          'bg-card w-full rounded-xl shadow-sm',
	          filterModalOpen
	            ? 'fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background lg:relative lg:h-auto'
	            : 'hidden p-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:p-4',
	        )}
	      >
	        <div
	          className={cn(
	            'flex flex-col gap-5',
	            filterModalOpen
	              ? 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pb-4'
	              : 'lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:px-4 lg:pb-6',
	          )}
	        >
          {filterModalOpen ? (
            <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 lg:hidden">
              <div className="flex items-center justify-between gap-2 py-2">
                <p
                  className={cn(
                    'flex-1 text-base font-semibold text-foreground',
                    isRTL ? 'text-right' : 'text-left',
                  )}
                >
                  {t('title')}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="inline-flex items-center gap-1 text-destructive hover:bg-destructive/10"
                  onClick={handleResetFilters}
                >
                  <Eraser className="size-4" />
                  {t('clear')}
                </Button>
	              </div>
	              <div className="-mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
	                {(() => {
	                  const tabs = [
	                    {
	                      key: 'main' as const,
	                      label: t('tabs.main'),
	                      onClick: () => setMobileTab('main'),
	                    },
	                    {
	                      key: 'category' as const,
	                      label: t('tabs.category'),
	                      onClick: () => setMobileTab('category'),
	                    },
	                    {
	                      key: 'personalize' as const,
	                      label: t('tabs.personalize'),
	                      onClick: () => setMobileTab('personalize'),
	                    },
	                  ];
	                  const orderedTabs = tabs;

	                  return (
	                    <div
	                      className={cn(
	                        'flex w-full overflow-hidden rounded-none border border-border divide-x divide-border',
	                        isRTL ? 'divide-x-reverse' : null,
	                      )}
	                    >
	                      {orderedTabs.map((tab) => (
	                        <Button
	                          key={tab.key}
	                          type="button"
	                          variant={mobileFiltersTab === tab.key ? 'default' : 'secondary'}
	                          className="flex-1 rounded-none shadow-none"
	                          onClick={tab.onClick}
	                        >
	                          {tab.label}
	                        </Button>
	                      ))}
	                    </div>
	                  );
	                })()}
	              </div>
	              <div className="h-0.5" />
	            </div>
          ) : null}

        {!filterModalOpen ? (
          <>
            <div className="hidden lg:flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1 text-destructive hover:bg-destructive/10"
                onClick={handleResetFilters}
              >
                <Eraser className="size-4" />
                {t('clear')}
              </Button>
            </div>
            <DesktopCategorySection
              categorySlug={categorySlug}
              baseCategory={baseCategory}
              breadcrumbItems={breadcrumbItems}
              categoryOptions={categoryOptions}
              isRTL={isRTL}
              locale={locale}
              categoriesBusy={categoriesBusy}
              title={t('categories.title')}
              loadingText={t('categories.loading')}
              emptyText={t('categories.empty')}
              onSelectCategory={handleCategorySelect}
            />
          </>
        ) : null}

        {!filterModalOpen ? (
          <DesktopRegionSelectors
            isRTL={isRTL}
            provinceLabel={t('provinceLabel')}
            cityLabel={t('cityLabel')}
            districtLabel={t('districtLabel')}
            provinceButtonLabel={provinceButtonLabel}
            cityButtonLabel={cityButtonLabel}
            districtButtonLabel={districtButtonLabel}
            onSelectProvince={() => {
              setDesktopDialogContext('province');
              setFilterModalOpen(true);
              setMobileTab('main');
              setProvinceDialogOpen(true);
            }}
            onSelectCity={() => {
              setDesktopDialogContext('city');
              setFilterModalOpen(true);
              setMobileTab('main');
              setCityDialogOpen(true);
            }}
            onSelectDistrict={() => {
              setDesktopDialogContext('district');
              setFilterModalOpen(true);
              setMobileTab('main');
              setDistrictDialogOpen(true);
            }}
            disableProvince={provincesLoading && provinces.length === 0}
            disableCity={isCityButtonDisabled}
            disableDistrict={isDistrictButtonDisabled}
            showDistrict={showDistrictFilter}
          />
        ) : null}

        {!filterModalOpen ? (
          <div className="hidden flex-col gap-4 lg:flex">
            <CategoryFiltersPreview
              categorySlug={categorySlug ?? baseCategory?.slug ?? null}
              locale={locale}
              isRTL={isRTL}
              includeKeys={['business-type']}
              excludeKeys={['addon_service_tags', 'recent_ads', 'has-video', 'has_video']}
            />
            <CategoryFiltersPreview
              categorySlug={categorySlug ?? baseCategory?.slug ?? null}
              locale={locale}
              isRTL={isRTL}
              includeKeys={['addon_service_tags', 'recent_ads', 'has-video', 'has_video']}
            />
            <CategoryFiltersPreview
              categorySlug={categorySlug ?? baseCategory?.slug ?? null}
              locale={locale}
              isRTL={isRTL}
              excludeKeys={['business-type', 'addon_service_tags', 'recent_ads', 'has-video', 'has_video']}
            />
          </div>
        ) : null}

        {!filterModalOpen ? (
            <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {t('ringBinder.label')}
          </label>
          <div className="relative">
            <select
              className={cn(
                'w-full appearance-none rounded-lg bg-muted/30 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isRTL ? 'pl-10 pr-3' : 'pl-3 pr-10',
              )}
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
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
                isRTL ? 'left-3' : 'right-3',
              )}
            />
          </div>
          {ringBinderLoading || ringBinderFetching ? (
            <p className="text-xs text-muted-foreground">{t('ringBinder.loading')}</p>
          ) : ringBinderFolders.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('ringBinder.empty')}</p>
          ) : null}
	        </div>
	        ) : null}

	        {!filterModalOpen ? (
	        <div className="space-y-2">
	          <label className="block text-sm font-medium text-foreground">{t('noteFilter.label')}</label>
	          <div className="relative">
            <select
              className={cn(
                'w-full appearance-none rounded-lg bg-muted/30 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isRTL ? 'pl-10 pr-3' : 'pl-3 pr-10',
              )}
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
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
                isRTL ? 'left-3' : 'right-3',
              )}
            />
          </div>
        </div>
        ) : null}

        {!filterModalOpen ? (
          <div className="hidden flex-col gap-2 lg:flex">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-between"
              onClick={() => setSavedFiltersModalOpen(true)}
              disabled={savedFiltersBusy}
            >
              <span className="truncate">{savedFiltersT('showButton')}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Button>
            <p className="text-xs text-muted-foreground">
              {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
            </p>
            <div className="hidden lg:flex">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => setSaveDialogOpen(true)}
                disabled={!hasActiveFilters || saveLimitReached || isCreatingSavedFilter}
                title={
                  !hasActiveFilters
                    ? savedFiltersT('disabled.noFilters')
                    : saveLimitReached
                      ? savedFiltersT('disabled.limitReached')
                      : undefined
                }
              >
                <span className="flex items-center justify-center gap-2">
                  <BookmarkPlus className="size-4" />
                  <span>{savedFiltersT('saveButton')}</span>
                </span>
              </Button>
            </div>
          </div>
        ) : null}

        {filterModalOpen ? (
          <div className="flex flex-1 flex-col lg:hidden">
            <AnimatePresence initial={false} custom={mobileTabDirection}>
              <motion.div
			                key={mobileFiltersTab}
			                className="flex flex-1 flex-col"
			                custom={mobileTabDirection}
			                initial={{
			                  x: mobileTabDirection === 1 ? '100%' : '-100%',
			                  opacity: 0,
		                }}
		                animate={{ x: 0, opacity: 1 }}
		                exit={{
		                  x: mobileTabDirection === 1 ? '-100%' : '100%',
		                  opacity: 0,
		                }}
		                transition={{
		                  x: { type: 'spring', stiffness: 320, damping: 35 },
		                  opacity: { duration: 0.15 },
		                }}
		                drag="x"
		                dragConstraints={{ left: 0, right: 0 }}
		                dragElastic={0.2}
		                onDragEnd={(_, info) => {
		                  const threshold = 40;
		                  const velocityThreshold = 450;
		                  const offsetX = isRTL ? -info.offset.x : info.offset.x;
		                  const velocityX = isRTL ? -info.velocity.x : info.velocity.x;

		                  if (offsetX < -threshold || velocityX < -velocityThreshold) {
		                    handleMobileTabSwipe(1);
		                  } else if (offsetX > threshold || velocityX > velocityThreshold) {
		                    handleMobileTabSwipe(-1);
		                  }
		                }}
		                style={{ touchAction: 'pan-y' }}
		              >
		                {mobileFiltersTab === 'main' ? (
		                  <>
			                    <div className="flex flex-col gap-3">
			                      <div className="py-0">
			                        <div className="space-y-1 lg:hidden">
			                          <label
			                            className={cn(
			                              'block px-4 text-sm font-medium text-foreground',
			                              isRTL ? 'text-right' : 'text-left',
			                            )}
			                          >
			                            {t('categories.title')}
			                          </label>
			                          <button
			                            type="button"
			                            onClick={handleOpenCategoryModal}
			                            dir={isRTL ? 'rtl' : 'ltr'}
			                            className={cn(
			                              'flex w-full items-center gap-3 rounded-xl bg-muted/30 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
			                              'flex-row justify-between',
			                            )}
			                          >
			                            {isRTL ? (
			                              <>
			                                <span className="flex flex-1 items-center justify-start gap-2 text-right text-foreground">
			                                  <Folder className="size-4 text-muted-foreground" />
			                                  <span className="truncate">{categorySummaryLabel}</span>
			                                </span>
			                                <ChevronLeft className="size-4 text-muted-foreground" />
			                              </>
			                            ) : (
			                              <>
			                                <span className="flex flex-1 items-center gap-2 text-left text-foreground">
			                                  <Folder className="size-4 text-muted-foreground" />
			                                  <span className="truncate">{categorySummaryLabel}</span>
			                                </span>
			                                <ChevronRight className="size-4 text-muted-foreground" />
			                              </>
			                            )}
			                          </button>
			                        </div>
			                      </div>

			                      <div className="py-0">
			                        <div className="flex flex-col gap-1">
			                          <label
			                            className={cn(
			                              'px-4 text-sm font-medium text-foreground',
			                              isRTL ? 'text-right' : 'text-left',
			                            )}
			                          >
			                            {t('provinceLabel')}
			                          </label>
			                          <Dialog
			                            open={provinceDialogOpen}
			                            onOpenChange={handleProvinceDialogChange}
			                            disableBackClose
			                          >
			                            <Button
			                              type="button"
			                              variant="secondary"
			                              className="justify-between"
			                              onClick={() => setProvinceDialogOpen(true)}
			                              disabled={provincesLoading && provinces.length === 0}
			                            >
			                              <span
			                                className="flex w-full items-center justify-between gap-3"
			                                dir={isRTL ? 'rtl' : 'ltr'}
			                              >
			                                <span className="truncate">{provinceButtonLabel}</span>
			                                <ChevronDown
			                                  className="size-4 shrink-0 text-muted-foreground"
			                                  aria-hidden="true"
			                                />
			                              </span>
			                            </Button>
			                            <DialogContent
			                              hideCloseButton
			                              dir={isRTL ? 'rtl' : 'ltr'}
			                              className={cn(
			                                'left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border-0 lg:p-6',
			                                isRTL ? 'text-right' : 'text-left',
			                              )}
			                            >
			                              <div className="flex h-full flex-col overflow-hidden">
                                <div className="border-b border-border px-6 py-4 lg:hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <p
                                    className={`text-base font-semibold ${
                                      isRTL ? 'text-right' : 'text-center'
                                    }`}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  >
                                    {t('provinceModalTitle')}
                                  </p>
                                  <p
                                    className={cn(
                                      'mt-1 text-sm text-muted-foreground',
                                      isRTL ? 'text-right' : 'text-center',
                                    )}
                                  >
                                    {t('provinceModalDescription')}
                                  </p>
                                </div>
                                <div className="hidden p-0 lg:block" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <div
                                    className={cn(
                                      'flex flex-col space-y-1.5',
                                      isRTL ? 'text-right items-end' : 'text-left items-start',
                                    )}
                                  >
                                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('provinceModalTitle')}
                                    </DialogTitle>
                                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('provinceModalDescription')}
                                    </DialogDescription>
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
                                  <div className="mt-1 mb-2">
                                    <Input
                                      value={provinceQuery}
                                      onChange={(e) => setProvinceQuery(e.target.value)}
                                      placeholder={t('provinceModalSearch')}
                                      className="h-10 rounded-lg shadow-none ring-0 focus-visible:ring-0"
                                    />
                                  </div>
                                  {(!draftProvinceAll && draftProvinceId !== null) ? (
                                    <div className="flex flex-wrap gap-2 pb-2">
                                      {provinceOptions
                                        .filter((p) => p.value === draftProvinceId)
                                        .map((p) => (
                                          <span
                                            key={p.value}
                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-foreground"
                                          >
                                            {p.label}
                                            <button
                                              type="button"
                                              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                              aria-label={t('provinceModalCancel')}
                                              onMouseDown={(e) => e.preventDefault()}
                                              onClick={() => {
                                                setDraftProvinceAll(true);
                                                setDraftProvinceId(null);
                                              }}
                                            >
                                              <X className="size-3" aria-hidden />
                                            </button>
                                          </span>
                                        ))}
                                    </div>
                                  ) : null}
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={draftProvinceAll}
			                                    dir={isRTL ? 'rtl' : 'ltr'}
			                                    className={cn(
			                                      'flex w-full items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-sm font-medium transition-colors hover:bg-muted/20',
			                                      isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
			                                    )}
			                                    onClick={handleProvinceSelectAll}
			                                  >
			                                    <SelectionIndicator type="radio" checked={draftProvinceAll} />
			                                    <span className="flex-1">{t('provinceModalSelectAll')}</span>
			                                  </button>

				                                <div className="rounded-xl border-0">
			                                    {provinceOptions.length === 0 ? (
			                                      <p className="p-4 text-sm text-muted-foreground">
			                                        {t('provinceModalEmpty')}
			                                      </p>
			                                    ) : (
				                                      <ul
				                                        role="radiogroup"
				                                        aria-label={t('provinceModalTitle')}
				                                      >
			                                        {provinceOptions.map((province) => (
			                                          <li key={province.value} className="border-b border-border">
			                                            <button
			                                              type="button"
			                                              role="radio"
			                                              aria-checked={
			                                                !draftProvinceAll && draftProvinceId === province.value
			                                              }
			                                              dir={isRTL ? 'rtl' : 'ltr'}
			                                              className={cn(
			                                                'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
			                                                isRTL
			                                                  ? 'flex-row-reverse text-right'
			                                                  : 'flex-row text-left',
			                                              )}
			                                              onClick={() => handleProvincePick(province.value)}
			                                            >
			                                              <SelectionIndicator
			                                                type="radio"
			                                                checked={
			                                                  !draftProvinceAll &&
			                                                  draftProvinceId === province.value
			                                                }
			                                              />
			                                              <span className="flex-1">{province.label}</span>
			                                            </button>
			                                          </li>
			                                        ))}
			                                      </ul>
			                                    )}
			                                  </div>
			                                </div>

			                                <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-0">
			                                  <div className="flex flex-row justify-end gap-3">
			                                    <Button
			                                      className="flex-1"
			                                      type="button"
			                                      onClick={applyProvinceSelection}
			                                      disabled={!draftProvinceAll && draftProvinceId === null}
			                                    >
			                                      <span className="flex items-center justify-center gap-2">
			                                        <Check className="size-4" aria-hidden="true" />
			                                        <span>{t('provinceModalConfirm')}</span>
			                                      </span>
			                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        setDesktopDialogContext('none');
                                        setFilterModalOpen(false);
                                        setProvinceDialogOpen(false);
                                      }}
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        <X className="size-4" aria-hidden="true" />
                                        <span>{t('provinceModalCancel')}</span>
                                      </span>
			                                    </Button>
			                                  </div>
			                                </div>
			                              </div>
			                            </DialogContent>
			                          </Dialog>
			                        </div>
			                      </div>

			                      {showCityFilter ? (
			                      <div className="py-0">
			                        <div className="flex flex-col gap-1">
			                          <label
			                            className={cn(
			                              'px-4 text-sm font-medium text-foreground',
			                              isRTL ? 'text-right' : 'text-left',
			                            )}
			                          >
			                            {t('cityLabel')}
			                          </label>
			                          <Dialog open={cityDialogOpen} onOpenChange={handleCityDialogChange} disableBackClose>
			                            <Button
			                              type="button"
			                              variant="secondary"
			                              className="justify-between"
			                              onClick={() => setCityDialogOpen(true)}
			                              disabled={isCityButtonDisabled}
			                            >
			                              <span
			                                className="flex w-full items-center justify-between gap-3"
			                                dir={isRTL ? 'rtl' : 'ltr'}
			                              >
			                                <span className="truncate">{cityButtonLabel}</span>
			                                <ChevronDown
			                                  className="size-4 shrink-0 text-muted-foreground"
			                                  aria-hidden="true"
			                                />
			                              </span>
			                            </Button>
			                            <DialogContent
			                              hideCloseButton
			                              dir={isRTL ? 'rtl' : 'ltr'}
			                              className={cn(
			                                'left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border-0 lg:p-6',
			                                isRTL ? 'text-right' : 'text-left',
			                              )}
			                            >
			                              <div className="flex h-full flex-col overflow-hidden">
                                <div className="border-b border-border px-6 py-4 lg:hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <p
                                    className={`text-base font-semibold ${
                                      isRTL ? 'text-right' : 'text-center'
                                    }`}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  >
                                    {t('cityModalTitle')}
                                  </p>
                                  <p
                                    className={cn(
                                      'mt-1 text-sm text-muted-foreground',
                                      isRTL ? 'text-right' : 'text-center',
                                    )}
                                  >
                                    {t('cityModalDescription')}
                                  </p>
                                </div>
                                <div className="hidden p-0 lg:block" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <div
                                    className={cn(
                                      'flex flex-col space-y-1.5',
                                      isRTL ? 'text-right items-end' : 'text-left items-start',
                                    )}
                                  >
                                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('cityModalTitle')}
                                    </DialogTitle>
                                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('cityModalDescription')}
                                    </DialogDescription>
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
                                  <div className="mt-1 mb-2">
                                    <Input
                                      value={cityQuery}
                                      onChange={(e) => setCityQuery(e.target.value)}
                                      placeholder={t('cityModalSearch')}
                                      className="h-10 rounded-lg shadow-none ring-0 focus-visible:ring-0"
                                    />
                                  </div>
                                  {!draftAllCities && draftCityIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pb-2">
                                      {cityOptions
                                        .filter((c) => draftCityIds.includes(c.value))
                                        .map((c) => (
                                          <span
                                            key={c.value}
                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-foreground"
                                          >
                                            {c.label}
                                            <button
                                              type="button"
                                              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                              aria-label={t('cityModalCancel')}
                                              onMouseDown={(e) => e.preventDefault()}
                                              onClick={() =>
                                                setDraftCityIds((prev) =>
                                                  prev.filter((id) => id !== c.value),
                                                )
                                              }
                                            >
                                              <X className="size-3" aria-hidden />
                                            </button>
                                          </span>
                                        ))}
                                    </div>
                                  ) : null}
                                  <button
                                    type="button"
                                    role="checkbox"
			                                    aria-checked={draftAllCities}
			                                    dir={isRTL ? 'rtl' : 'ltr'}
			                                    className={cn(
			                                      'flex w-full items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-sm font-medium transition-colors hover:bg-muted/20',
			                                      isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
			                                    )}
			                                    onClick={handleSelectAllCities}
			                                  >
			                                    <SelectionIndicator type="checkbox" checked={draftAllCities} />
			                                    <span className="flex-1">{t('cityModalSelectAll')}</span>
			                                  </button>

				                                <div className="rounded-xl border-0">
			                                    {cityOptions.length === 0 ? (
			                                      <p className="p-4 text-sm text-muted-foreground">
			                                        {t('cityModalEmpty')}
			                                      </p>
			                                    ) : (
				                                      <ul aria-label={t('cityModalTitle')}>
			                                        {cityOptions.map((city) => (
			                                          <li key={city.value} className="border-b border-border">
			                                            <button
			                                              type="button"
			                                              role="checkbox"
			                                              aria-checked={
			                                                !draftAllCities && draftCityIds.includes(city.value)
			                                              }
			                                              dir={isRTL ? 'rtl' : 'ltr'}
			                                              className={cn(
			                                                'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
			                                                isRTL
			                                                  ? 'flex-row-reverse text-right'
			                                                  : 'flex-row text-left',
			                                              )}
			                                              onClick={() => toggleCitySelection(city.value)}
			                                            >
			                                              <SelectionIndicator
			                                                type="checkbox"
			                                                checked={
			                                                  !draftAllCities && draftCityIds.includes(city.value)
			                                                }
			                                              />
			                                              <span className="flex-1">{city.label}</span>
			                                            </button>
			                                          </li>
			                                        ))}
			                                      </ul>
			                                    )}
			                                  </div>
			                                </div>

			                                <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-0">
			                                  <div className="flex flex-row justify-end gap-3">
			                                    <Button
			                                      className="flex-1"
			                                      type="button"
			                                      onClick={applyCitySelection}
			                                    >
			                                      <span className="flex items-center justify-center gap-2">
			                                        <Check className="size-4" aria-hidden="true" />
			                                        <span>{t('cityModalConfirm')}</span>
			                                      </span>
			                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        setDesktopDialogContext('none');
                                        setFilterModalOpen(false);
                                        setCityDialogOpen(false);
                                      }}
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        <X className="size-4" aria-hidden="true" />
                                        <span>{t('cityModalCancel')}</span>
                                      </span>
			                                    </Button>
			                                  </div>
			                                </div>
			                              </div>
			                            </DialogContent>
			                          </Dialog>
			                        </div>
			                      </div>
			                      ) : null}

			                      {showDistrictFilter ? (
			                      <div className="py-0">
			                        <div className="flex flex-col gap-1">
			                          <label
			                            className={cn(
			                              'px-4 text-sm font-medium text-foreground',
			                              isRTL ? 'text-right' : 'text-left',
			                            )}
			                          >
			                            {t('districtLabel')}
			                          </label>
			                          <Dialog
			                            open={districtDialogOpen}
			                            onOpenChange={handleDistrictDialogChange}
			                            disableBackClose
			                          >
			                            <Button
			                              type="button"
			                              variant="secondary"
			                              className="justify-between"
			                              onClick={() => setDistrictDialogOpen(true)}
			                              disabled={isDistrictButtonDisabled}
			                            >
			                              <span
			                                className="flex w-full items-center justify-between gap-3"
			                                dir={isRTL ? 'rtl' : 'ltr'}
			                              >
			                                <span className="truncate">{districtButtonLabel}</span>
			                                <ChevronDown
			                                  className="size-4 shrink-0 text-muted-foreground"
			                                  aria-hidden="true"
			                                />
			                              </span>
			                            </Button>
			                            <DialogContent
			                              hideCloseButton
			                              dir={isRTL ? 'rtl' : 'ltr'}
			                              className={cn(
			                                'left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border-0 lg:p-6',
			                                isRTL ? 'text-right' : 'text-left',
			                              )}
			                            >
			                              <div className="flex h-full flex-col overflow-hidden">
                                <div className="border-b border-border px-6 py-4 lg:hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <p
                                    className={`text-base font-semibold ${
                                      isRTL ? 'text-right' : 'text-center'
                                    }`}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  >
                                    {t('districtModalTitle')}
                                  </p>
                                  <p
                                    className={cn(
                                      'mt-1 text-sm text-muted-foreground',
                                      isRTL ? 'text-right' : 'text-center',
                                    )}
                                  >
                                    {t('districtModalDescription')}
                                  </p>
                                </div>
                                <div className="hidden p-0 lg:block" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <div
                                    className={cn(
                                      'flex flex-col space-y-1.5',
                                      isRTL ? 'text-right items-end' : 'text-left items-start',
                                    )}
                                  >
                                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('districtModalTitle')}
                                    </DialogTitle>
                                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                                      {t('districtModalDescription')}
                                    </DialogDescription>
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
                                  <div className="mt-1 mb-2">
                                    <Input
                                      value={districtQuery}
                                      onChange={(e) => setDistrictQuery(e.target.value)}
                                      placeholder={t('districtModalSearch')}
                                      className="h-10 rounded-lg shadow-none ring-0 focus-visible:ring-0"
                                    />
                                  </div>
                                  {!draftAllDistricts && draftDistrictIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 pb-2">
                                      {districtOptions
                                        .filter((d) => draftDistrictIds.includes(d.value))
                                        .map((d) => (
                                          <span
                                            key={d.value}
                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-foreground"
                                          >
                                            {d.label}
                                            <button
                                              type="button"
                                              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                              aria-label={t('districtModalCancel')}
                                              onMouseDown={(e) => e.preventDefault()}
                                              onClick={() =>
                                                setDraftDistrictIds((prev) =>
                                                  prev.filter((id) => id !== d.value),
                                                )
                                              }
                                            >
                                              <X className="size-3" aria-hidden />
                                            </button>
                                          </span>
                                        ))}
                                    </div>
                                  ) : null}
                                  <button
                                    type="button"
                                    role="checkbox"
			                                    aria-checked={draftAllDistricts}
			                                    dir={isRTL ? 'rtl' : 'ltr'}
			                                    className={cn(
			                                      'flex w-full items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-sm font-medium transition-colors hover:bg-muted/20',
			                                      isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
			                                    )}
			                                    onClick={handleSelectAllDistricts}
			                                  >
			                                    <SelectionIndicator type="checkbox" checked={draftAllDistricts} />
			                                    <span className="flex-1">{t('districtModalSelectAll')}</span>
			                                  </button>

				                                <div className="rounded-xl border-0">
			                                    {districtOptions.length === 0 ? (
			                                      <p className="p-4 text-sm text-muted-foreground">
			                                        {t('districtModalEmpty')}
			                                      </p>
			                                    ) : (
				                                      <ul aria-label={t('districtModalTitle')}>
			                                        {districtOptions.map((district) => (
			                                          <li key={district.value} className="border-b border-border">
			                                            <button
			                                              type="button"
			                                              role="checkbox"
			                                              aria-checked={
			                                                !draftAllDistricts &&
			                                                draftDistrictIds.includes(district.value)
			                                              }
			                                              dir={isRTL ? 'rtl' : 'ltr'}
			                                              className={cn(
			                                                'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
			                                                isRTL
			                                                  ? 'flex-row-reverse text-right'
			                                                  : 'flex-row text-left',
			                                              )}
			                                              onClick={() => toggleDistrictSelection(district.value)}
			                                            >
			                                              <SelectionIndicator
			                                                type="checkbox"
			                                                checked={
			                                                  !draftAllDistricts &&
			                                                  draftDistrictIds.includes(district.value)
			                                                }
			                                              />
			                                              <span className="flex-1">{district.label}</span>
			                                            </button>
			                                          </li>
			                                        ))}
			                                      </ul>
			                                    )}
			                                  </div>
			                                </div>

			                                <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-0">
			                                  <div className="flex flex-row justify-end gap-3">
			                                    <Button
			                                      className="flex-1"
			                                      type="button"
			                                      onClick={applyDistrictSelection}
			                                    >
			                                      <span className="flex items-center justify-center gap-2">
			                                        <Check className="size-4" aria-hidden="true" />
			                                        <span>{t('districtModalConfirm')}</span>
			                                      </span>
			                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        setDesktopDialogContext('none');
                                        setFilterModalOpen(false);
                                        setDistrictDialogOpen(false);
                                      }}
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        <X className="size-4" aria-hidden="true" />
                                        <span>{t('districtModalCancel')}</span>
                                      </span>
			                                    </Button>
			                                  </div>
			                                </div>
			                              </div>
			                            </DialogContent>
			                          </Dialog>
			                        </div>
			                      </div>
			                      ) : null}

			                      <div className="py-0">
			                        <CategoryFiltersPreview
			                          categorySlug={categorySlug ?? baseCategory?.slug ?? null}
			                          locale={locale}
			                          isRTL={isRTL}
			                          includeKeys={['business-type']}
			                          excludeKeys={[
			                            'addon_service_tags',
			                            'recent_ads',
			                            'has-video',
			                            'has_video',
			                          ]}
			                        />
			                      </div>
			                    </div>
			                  </>
			                ) : mobileFiltersTab === 'category' ? (
			                  <>
			                    <CategoryFiltersPreview
			                      categorySlug={categorySlug ?? baseCategory?.slug ?? null}
			                      locale={locale}
			                      isRTL={isRTL}
			                      includeKeys={['addon_service_tags', 'recent_ads', 'has-video', 'has_video']}
			                    />
			                    <CategoryFiltersPreview
			                      categorySlug={categorySlug ?? baseCategory?.slug ?? null}
			                      locale={locale}
			                      isRTL={isRTL}
			                      excludeKeys={[
			                        'business-type',
			                        'addon_service_tags',
			                        'recent_ads',
			                        'has-video',
			                        'has_video',
			                      ]}
			                    />
			                  </>
			                ) : (
			                  <div className="flex flex-col gap-5">
		                    <div className="flex flex-col gap-2">
		                      <Button
		                        type="button"
		                        variant="secondary"
		                        className="w-full justify-between"
		                        onClick={() => setSavedFiltersModalOpen(true)}
		                        disabled={savedFiltersBusy}
		                      >
		                        <span className="truncate">{savedFiltersT('showButton')}</span>
		                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
		                      </Button>
		                      <p className="text-xs text-muted-foreground">
		                        {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
		                      </p>
		                    </div>

			                    <div className="space-y-2">
			                      <label
			                        className={cn(
			                          'block px-3 text-sm font-medium text-foreground',
			                          isRTL ? 'text-right' : 'text-left',
			                        )}
			                      >
			                        {t('ringBinder.label')}
			                      </label>
		                      <div className="relative">
		                        <select
		                          className={cn(
		                            'w-full appearance-none rounded-lg bg-muted/30 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		                            isRTL ? 'pl-10 pr-3' : 'pl-3 pr-10',
		                          )}
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
		                        <ChevronDown
		                          aria-hidden="true"
		                          className={cn(
		                            'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
		                            isRTL ? 'left-3' : 'right-3',
		                          )}
		                        />
		                      </div>
		                      {ringBinderLoading || ringBinderFetching ? (
		                        <p className="text-xs text-muted-foreground">{t('ringBinder.loading')}</p>
		                      ) : ringBinderFolders.length === 0 ? (
		                        <p className="text-xs text-muted-foreground">{t('ringBinder.empty')}</p>
		                      ) : null}
		                    </div>

			                    <div className="space-y-2">
			                      <label
			                        className={cn(
			                          'block px-3 text-sm font-medium text-foreground',
			                          isRTL ? 'text-right' : 'text-left',
			                        )}
			                      >
			                        {t('noteFilter.label')}
			                      </label>
		                      <div className="relative">
		                        <select
		                          className={cn(
		                            'w-full appearance-none rounded-lg bg-muted/30 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		                            isRTL ? 'pl-10 pr-3' : 'pl-3 pr-10',
		                          )}
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
		                        <ChevronDown
		                          aria-hidden="true"
		                          className={cn(
		                            'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
		                            isRTL ? 'left-3' : 'right-3',
		                          )}
		                        />
		                      </div>
		                    </div>
		                  </div>
		                )}
		              </motion.div>
		            </AnimatePresence>
		          </div>
		        ) : null}
	        </div>
	        {filterModalOpen ? (
	          <div className="z-10 mt-auto flex shrink-0 flex-col justify-end gap-3 border-t border-border bg-background p-4 lg:hidden">
	            <div className="flex flex-row gap-3">
	              <Button
	                type="button"
                className="flex-1"
                onClick={() => {
                  dispatch(commitAppliedFilters());
                  setFilterModalOpen(false);
                }}
                disabled={!modalHasPendingChanges}
              >
                <span className="flex items-center justify-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  <span>{t('applyFilters')}</span>
                </span>
              </Button>
              {modalHasPendingChanges ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={!hasActiveFilters || saveLimitReached || isCreatingSavedFilter}
                  onClick={() => setSaveDialogOpen(true)}
                  title={
                    !hasActiveFilters
                      ? savedFiltersT('disabled.noFilters')
                      : saveLimitReached
                        ? savedFiltersT('disabled.limitReached')
                        : undefined
                  }
                >
                  <span className="flex items-center justify-center gap-2">
                    <BookmarkPlus className="size-4" />
                    <span>{savedFiltersT('saveButton')}</span>
                  </span>
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setFilterModalOpen(false)}
            >
              <span className="flex items-center justify-center gap-2">
                <X className="size-4" aria-hidden="true" />
                <span>{t('mobileBack')}</span>
              </span>
            </Button>
          </div>
        ) : null}
      </section>
      
      <CategorySelectionModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        baseCategory={baseCategory}
        categoryStructures={categoryStructures}
        selectedCategory={selectedCategory}
        isRTL={isRTL}
        onSelect={(category) =>
          dispatch(
            setCategorySelection({
              slug: category.slug,
              depth: category.depth,
            }),
          )
        }
        t={t}
      />
      <SaveFilterDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title={savedFiltersT('dialog.saveTitle')}
        description={savedFiltersT('dialog.saveDescription')}
        placeholder={savedFiltersT('dialog.namePlaceholder')}
        submitLabel={savedFiltersT('dialog.saveAction')}
        cancelLabel={savedFiltersT('dialog.cancel')}
        loading={isCreatingSavedFilter}
        defaultName=""
        onSubmit={handleSaveFilter}
      />

      <Dialog open={savedFiltersModalOpen} onOpenChange={setSavedFiltersModalOpen} disableBackClose>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:p-6"
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border px-6 py-4 lg:hidden">
              <p className={cn('text-base font-semibold', isRTL ? 'text-right' : 'text-left')}>
                {savedFiltersT('title')}
              </p>
              <p className={cn('mt-1 text-sm text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
                {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
              </p>
            </div>

            <div className="hidden px-0 py-4 lg:block">
              <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                <DialogTitle>{savedFiltersT('title')}</DialogTitle>
                <DialogDescription>
                  {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 lg:px-4">
              {savedFiltersBusy ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      className="h-14 animate-pulse rounded-xl bg-muted/40"
                    />
                  ))}
                </div>
              ) : savedFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground">{savedFiltersT('empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {savedFilters.map((filter) => (
                    <li
                      key={filter.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{filter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {savedFiltersT('lastUpdated', {
                            value: new Date(filter.updatedAt).toLocaleString(locale, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }),
                          })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          handleApplySavedFilter(filter);
                          setSavedFiltersModalOpen(false);
                        }}
                      >
                        {savedFiltersT('apply')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-4">
              <Button type="button" variant="outline" className="w-full" onClick={() => setSavedFiltersModalOpen(false)}>
                <span className="flex items-center justify-center gap-2">
                  <X className="size-4" aria-hidden="true" />
                  <span>{savedFiltersT('dialog.cancel')}</span>
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
