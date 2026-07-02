import { create } from 'zustand';

const useUiStore = create((set) => ({
  globalLoading: false,
  toast: null,

  setGlobalLoading: (v) => set({ globalLoading: v }),

  showToast: (type, title, message) => {
    set({ toast: { type, title, message, id: Date.now() } });
  },

  clearToast: () => set({ toast: null }),
}));

export default useUiStore;
