import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthenticatedUser } from '@/types/auth';

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUser | null;
  hydrated: boolean;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
};

export const AUTH_STORAGE_KEY = 'my-ads-auth-state';

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};

const readStoredAuth = (): AuthState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Omit<AuthState, 'hydrated'>;

    return {
      ...initialState,
      ...parsed,
      hydrated: true,
    };
  } catch {
    return null;
  }
};

const persistAuthState = (state: AuthState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const serializableState: Omit<AuthState, 'hydrated'> = {
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user,
    };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(serializableState));
  } catch {
    // Ignore persistence errors
  }
};

const clearStoredAuth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateAuthState(state, action: PayloadAction<AuthState | null>) {
      if (action.payload) {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.hydrated = true;
      } else {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.hydrated = true;
      }
    },
    setAuth(state, action: PayloadAction<AuthPayload>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.hydrated = true;
      persistAuthState(state);
    },
    clearAuth(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.hydrated = true;
      clearStoredAuth();
    },
    updateUser(state, action: PayloadAction<AuthenticatedUser>) {
      state.user = action.payload;
      if (state.accessToken && state.refreshToken) {
        persistAuthState(state);
      }
    },
  },
});

export const hydrateAuthFromStorage = () => readStoredAuth();

export const { hydrateAuthState, setAuth, clearAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;
