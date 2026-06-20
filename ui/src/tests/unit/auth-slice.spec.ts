import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  hydrateAuthState,
  setAuth,
  clearAuth,
  updateUser,
  hydrateAuthFromStorage,
  AUTH_STORAGE_KEY,
} from '@/features/auth/authSlice';
import type { AuthState, AuthPayload } from '@/features/auth/authSlice';
import type { AuthenticatedUser } from '@/types/auth';

const mockUser: AuthenticatedUser = {
  id: 'user-1',
  phone: '9123456789',
  email: null,
  firstName: 'John',
  lastName: 'Doe',
  provinceId: null,
  province: null,
  cityId: null,
  city: null,
  profileImageUrl: null,
  role: 'USER',
  isActive: true,
};

const mockPayload: AuthPayload = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  user: mockUser,
};

describe('authSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  const createTestStore = (preloaded?: { auth: AuthState }) =>
    configureStore({
      reducer: { auth: authReducer },
      preloadedState: preloaded,
    });

  beforeEach(() => {
    localStorage.clear();
    store = createTestStore();
  });

  describe('initial state', () => {
    it('has null tokens and user', () => {
      const state = store.getState().auth;
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.hydrated).toBe(false);
    });
  });

  describe('hydrateAuthState', () => {
    it('sets tokens and user from payload', () => {
      store.dispatch(
        hydrateAuthState({
          accessToken: 'saved-access',
          refreshToken: 'saved-refresh',
          user: mockUser,
          hydrated: true,
          deviceChanged: false,
          challengerDevice: null,
          isBaleMiniApp: false,
          pendingDeepLink: null,
        }),
      );
      const state = store.getState().auth;
      expect(state.accessToken).toBe('saved-access');
      expect(state.hydrated).toBe(true);
    });

    it('clears state when payload is null', () => {
      store.dispatch(hydrateAuthState(null));
      const state = store.getState().auth;
      expect(state.accessToken).toBeNull();
      expect(state.hydrated).toBe(true);
    });
  });

  describe('setAuth', () => {
    it('sets tokens and user', () => {
      store.dispatch(setAuth(mockPayload));
      const state = store.getState().auth;
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
      expect(state.user).toEqual(mockUser);
      expect(state.hydrated).toBe(true);
    });

    it('persists to localStorage', () => {
      store.dispatch(setAuth(mockPayload));
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.accessToken).toBe('access-123');
      expect(parsed.user.firstName).toBe('John');
    });
  });

  describe('clearAuth', () => {
    it('clears tokens and user', () => {
      store.dispatch(setAuth(mockPayload));
      store.dispatch(clearAuth());
      const state = store.getState().auth;
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.hydrated).toBe(true);
    });

    it('removes from localStorage', () => {
      store.dispatch(setAuth(mockPayload));
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
      store.dispatch(clearAuth());
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('updates the user while keeping tokens', () => {
      store.dispatch(setAuth(mockPayload));
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      store.dispatch(updateUser(updatedUser));
      const state = store.getState().auth;
      expect(state.user?.firstName).toBe('Jane');
      expect(state.accessToken).toBe('access-123');
    });

    it('persists to localStorage when tokens exist', () => {
      store.dispatch(setAuth(mockPayload));
      store.dispatch(updateUser({ ...mockUser, firstName: 'Jane' }));
      const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!);
      expect(stored.user.firstName).toBe('Jane');
    });

    it('skips localStorage when no tokens are set', () => {
      store.dispatch(updateUser(mockUser));
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  describe('hydrateAuthFromStorage', () => {
    it('reads saved state from localStorage', () => {
      const saved = { accessToken: 'saved', refreshToken: 'saved-r', user: mockUser };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(saved));
      const result = hydrateAuthFromStorage();
      expect(result).not.toBeNull();
      expect(result!.accessToken).toBe('saved');
      expect(result!.hydrated).toBe(true);
    });

    it('returns null when nothing is stored', () => {
      expect(hydrateAuthFromStorage()).toBeNull();
    });

    it('returns null for corrupted JSON', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'not-json');
      expect(hydrateAuthFromStorage()).toBeNull();
    });
  });
});
