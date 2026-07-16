import { getApi } from './client';

export function getWallet() {
  return getApi('/api/wallets/me/balance');
}

export function getWalletTransactions(page = 0) {
  return getApi(`/api/wallets/me/transactions?page=${page}`);
}

export function getAllWalletTransactions() {
  return getApi('/api/wallets/me/transactions/all');
}
