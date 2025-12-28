import { apiSlice } from '../baseApi';

import type { City, District, Province } from '@/types/location';

const locationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProvinces: builder.query<Province[], void>({
      query: () => '/provinces',
      providesTags: ['Locations'],
    }),
    getCities: builder.query<City[], number | void>({
      query: (provinceId) => (provinceId ? `/cities?provinceId=${provinceId}` : '/cities'),
      providesTags: ['Locations'],
    }),
    getDistricts: builder.query<District[], number | number[] | void>({
      query: (cityArg) => {
        if (cityArg === undefined || cityArg === null) {
          return '/districts';
        }

        if (Array.isArray(cityArg)) {
          const filtered = cityArg.filter((id) => typeof id === 'number');
          if (filtered.length === 0) {
            return '/districts';
          }
          return `/districts?cityIds=${filtered.join(',')}`;
        }

        return `/districts?cityId=${cityArg}`;
      },
      providesTags: ['Locations'],
    }),
    updateProvinceAllowPosting: builder.mutation<Province, { id: number; allowPosting: boolean }>({
      query: ({ id, allowPosting }) => ({
        url: `/provinces/${id}/allow-posting`,
        method: 'PATCH',
        body: { allowPosting },
      }),
      invalidatesTags: ['Locations'],
    }),
    updateCityAllowPosting: builder.mutation<City, { id: number; allowPosting: boolean }>({
      query: ({ id, allowPosting }) => ({
        url: `/cities/${id}/allow-posting`,
        method: 'PATCH',
        body: { allowPosting },
      }),
      invalidatesTags: ['Locations'],
    }),
  }),
});

export const {
  useGetProvincesQuery,
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useUpdateProvinceAllowPostingMutation,
  useUpdateCityAllowPostingMutation,
} = locationsApi;
