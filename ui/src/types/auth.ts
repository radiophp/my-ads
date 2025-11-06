export type AuthenticatedUser = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provinceId: number | null;
  province: string | null;
  cityId: number | null;
  city: string | null;
  profileImageUrl: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
};

export type CurrentUser = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provinceId: number | null;
  province: string | null;
  cityId: number | null;
  city: string | null;
  profileImageUrl: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SuccessResponse = {
  success: boolean;
};
