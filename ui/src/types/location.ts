export type Province = {
  id: number;
  name: string;
};

export type City = {
  id: number;
  name: string;
  provinceId: number;
  province: string;
};
