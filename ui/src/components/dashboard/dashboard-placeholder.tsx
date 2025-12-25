'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { skipToken } from '@reduxjs/toolkit/query';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';
import { useAppDispatch } from '@/lib/hooks';
import {
  resetSearchFilter,
  setProvince,
  setRingBinderFolder,
  setSelectedCities,
  setSelectedDistricts,
} from '@/features/search-filter/searchFilterSlice';
import {
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useGetProvincesQuery,
} from '@/features/api/apiSlice';

export function DashboardPlaceholder() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const locationParams = useMemo(() => {
    const provinceParam = searchParams.get('provinceId') ?? searchParams.get('province');
    const cityParam = searchParams.get('cityId') ?? searchParams.get('city');
    const districtParam = searchParams.get('districtId') ?? searchParams.get('district');
    return { provinceParam, cityParam, districtParam };
  }, [searchParams]);
  const locationKey = useMemo(
    () =>
      [locationParams.provinceParam, locationParams.cityParam, locationParams.districtParam]
        .filter(Boolean)
        .join('|'),
    [locationParams],
  );
  const parseNumeric = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const provinceIdParam = parseNumeric(locationParams.provinceParam);
  const cityIdParam = parseNumeric(locationParams.cityParam);
  const districtIdParam = parseNumeric(locationParams.districtParam);
  const shouldResolveLocation = Boolean(
    locationParams.provinceParam || locationParams.cityParam || locationParams.districtParam,
  );
  const needsProvinces = Boolean(locationParams.provinceParam && !provinceIdParam);
  const needsCities = Boolean(locationParams.cityParam && (!cityIdParam || !provinceIdParam));
  const needsDistricts = Boolean(
    locationParams.districtParam && (!districtIdParam || !cityIdParam || !provinceIdParam),
  );
  const { data: provinces = [] } = useGetProvincesQuery(needsProvinces ? undefined : skipToken);
  const { data: cities = [] } = useGetCitiesQuery(needsCities ? undefined : skipToken);
  const { data: districts = [] } = useGetDistrictsQuery(needsDistricts ? undefined : skipToken);
  const appliedLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const ringFolderParam =
      searchParams.get('ringFolderId') ?? searchParams.get('ringBinderFolderId');
    if (ringFolderParam) {
      dispatch(setRingBinderFolder(ringFolderParam));
    }
  }, [dispatch, searchParams]);

  useEffect(() => {
    if (!shouldResolveLocation) {
      return;
    }
    if (appliedLocationRef.current === locationKey) {
      return;
    }
    if (needsProvinces && provinces.length === 0) {
      return;
    }
    if (needsCities && cities.length === 0) {
      return;
    }
    if (needsDistricts && districts.length === 0) {
      return;
    }

    let resolvedProvinceId = provinceIdParam;
    let resolvedCityId = cityIdParam;
    let resolvedDistrictId = districtIdParam;

    if (locationParams.districtParam) {
      const hasCompleteIds =
        typeof resolvedDistrictId === 'number' &&
        typeof resolvedCityId === 'number' &&
        typeof resolvedProvinceId === 'number';
      if (!hasCompleteIds) {
        const districtMatch =
          typeof resolvedDistrictId === 'number'
            ? districts.find((district) => district.id === resolvedDistrictId)
            : districts.find((district) => district.slug === locationParams.districtParam);
        if (!districtMatch) {
          return;
        }
        resolvedDistrictId = districtMatch.id;
        resolvedCityId = districtMatch.cityId;
        resolvedProvinceId = districtMatch.provinceId;
      }
    } else if (locationParams.cityParam) {
      const hasCityAndProvince =
        typeof resolvedCityId === 'number' && typeof resolvedProvinceId === 'number';
      if (!hasCityAndProvince) {
        const cityMatch =
          typeof resolvedCityId === 'number'
            ? cities.find((city) => city.id === resolvedCityId)
            : cities.find((city) => city.slug === locationParams.cityParam);
        if (!cityMatch) {
          return;
        }
        resolvedCityId = cityMatch.id;
        resolvedProvinceId = resolvedProvinceId ?? cityMatch.provinceId;
      }
    } else if (locationParams.provinceParam && !resolvedProvinceId) {
      const provinceMatch = provinces.find(
        (province) => province.slug === locationParams.provinceParam,
      );
      if (!provinceMatch) {
        return;
      }
      resolvedProvinceId = provinceMatch.id;
    }

    appliedLocationRef.current = locationKey;
    dispatch(resetSearchFilter());
    if (typeof resolvedProvinceId === 'number') {
      dispatch(setProvince(resolvedProvinceId));
    }
    if (typeof resolvedCityId === 'number') {
      dispatch(setSelectedCities([resolvedCityId]));
    }
    if (typeof resolvedDistrictId === 'number') {
      dispatch(setSelectedDistricts([resolvedDistrictId]));
    }
  }, [
    cityIdParam,
    cities,
    dispatch,
    districtIdParam,
    districts,
    locationKey,
    locationParams.cityParam,
    locationParams.districtParam,
    locationParams.provinceParam,
    needsCities,
    needsDistricts,
    needsProvinces,
    provinceIdParam,
    provinces,
    shouldResolveLocation,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <section className="flex h-full min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:overflow-hidden lg:px-8">
        <div className="grid size-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="w-full lg:col-span-3 lg:flex lg:h-full lg:min-h-0">
            <DashboardSearchFilterPanel />
          </div>
          <div className="w-full lg:col-span-9 lg:flex lg:h-full lg:min-h-0">
            <DivarPostsFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
