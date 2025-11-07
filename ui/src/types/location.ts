export type Province = {
  id: number;
  name: string;
  slug: string;
  allowPosting: boolean;
};

export type City = {
  id: number;
  name: string;
  slug: string;
  provinceId: number;
  province: string;
  provinceSlug: string;
  allowPosting: boolean;
};

export type District = {
  id: number;
  name: string;
  slug: string;
  cityId: number;
  city: string;
  citySlug: string;
  provinceId: number;
  province: string;
  provinceSlug: string;
};
