import { create } from 'zustand';
import { getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/authApi';

const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  error: null,

  checkAuth: async () => {
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
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRegister(username, email, password);
      const user = data.user || data;
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
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
