import { create } from 'zustand';
import { getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/authApi';
import { firebaseLogin as apiFirebaseLogin } from '../api/oauthApi';
import { setToken, getToken } from '../api/client';

const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  error: null,

  checkAuth: async () => {
    if (!getToken()) {
      set({ user: null });
      return null;
    }
    try {
      const data = await getCurrentUser();
      const user = data.user || data;
      set({ user, error: null });
      return user;
    } catch {
      set({ user: null });
      return null;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLogin(email, password);
      const user = data.user || data;
      if (data.accessToken) setToken(data.accessToken);
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (username, email, password, idempotencyKey) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRegister(username, email, password, idempotencyKey);
      const user = data.user || data;
      if (data.accessToken) setToken(data.accessToken);
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  firebaseLogin: async (idToken, provider) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFirebaseLogin(idToken, provider);
      const user = data.user || data;
      if (data.accessToken) setToken(data.accessToken);
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch { /* ignore */ }
    setToken(null);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
