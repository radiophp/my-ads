'use client';

import { skipToken } from '@reduxjs/toolkit/query';

import {
  useGetProvincesQuery,
  useGetCitiesQuery,
  useGetDistrictsQuery,
} from '@/features/api/endpoints/locations';
import { SearchableSelect } from './searchable-select';

type LocationCascadeProps = {
  provinceId: number | null;
  cityId: number | null;
  districtId: number | null;
  onProvinceChange: (id: number | null) => void;
  onCityChange: (id: number | null) => void;
  onDistrictChange: (id: number | null) => void;
  provincePlaceholder?: string;
  cityPlaceholder?: string;
  districtPlaceholder?: string;
  provinceSearchPlaceholder?: string;
  citySearchPlaceholder?: string;
  districtSearchPlaceholder?: string;
  allText?: string;
  disabled?: boolean;
};

export function LocationCascade({
  provinceId,
  cityId,
  districtId,
  onProvinceChange,
  onCityChange,
  onDistrictChange,
  provincePlaceholder = 'All provinces',
  cityPlaceholder = 'All cities',
  districtPlaceholder = 'All districts',
  provinceSearchPlaceholder = 'Search province...',
  citySearchPlaceholder = 'Search city...',
  districtSearchPlaceholder = 'Search district...',
  allText = 'All',
  disabled = false,
}: LocationCascadeProps) {
  const { data: provinces = [] } = useGetProvincesQuery();
  const { data: cities = [] } = useGetCitiesQuery(provinceId ?? undefined);
  const { data: districts = [] } = useGetDistrictsQuery(cityId ?? skipToken);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SearchableSelect
        options={[
          { value: '', label: allText },
          ...provinces.map((p) => ({ value: String(p.id), label: p.name, searchText: p.slug })),
        ]}
        value={provinceId ? String(provinceId) : ''}
        onSelect={(val) => {
          onProvinceChange(val ? Number(val) : null);
          onCityChange(null);
          onDistrictChange(null);
        }}
        placeholder={provincePlaceholder}
        searchPlaceholder={provinceSearchPlaceholder}
        disabled={disabled}
      />
      <SearchableSelect
        options={[
          { value: '', label: allText },
          ...cities.map((c) => ({ value: String(c.id), label: c.name, searchText: c.slug })),
        ]}
        value={cityId ? String(cityId) : ''}
        onSelect={(val) => {
          onCityChange(val ? Number(val) : null);
          onDistrictChange(null);
        }}
        placeholder={cityPlaceholder}
        searchPlaceholder={citySearchPlaceholder}
        disabled={disabled || !provinceId}
      />
      <SearchableSelect
        options={[
          { value: '', label: allText },
          ...districts.map((d) => ({ value: String(d.id), label: d.name, searchText: d.slug })),
        ]}
        value={districtId ? String(districtId) : ''}
        onSelect={(val) => onDistrictChange(val ? Number(val) : null)}
        placeholder={districtPlaceholder}
        searchPlaceholder={districtSearchPlaceholder}
        disabled={disabled || !cityId}
      />
    </div>
  );
}
