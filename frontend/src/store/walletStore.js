import { create } from 'zustand';
import { getWallet,getAllWalletTransactions } from '../api/walletApi';


const useWalletStore = create((set) => ({
  balance: 0,
  transactions: [],
  loading: false,

  fetchWallet: async () => {
    set({ loading: true });
    try {
      const data = await getWallet();
      set({ balance: data.balance || 0, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const data = await getAllWalletTransactions();
      set({ transactions: data || [], loading: false })
    } catch {
      set({ loading: false })
    }
  }
}));

export default useWalletStore;
