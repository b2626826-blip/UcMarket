import { getApi, postApi } from './client';

export function getWallet() {
  return getApi('/api/wallet');
}

export function getWalletTransactions() {
  return getApi('/api/wallet/transactions');
}

export function deposit(amount) {
  return postApi('/api/wallet/deposit', { amount });
}

export function withdraw(amount) {
  return postApi('/api/wallet/withdraw', { amount });
}
