import { describe, it, expect, beforeEach } from 'vitest';
import { getAllWalletTransactions, getWallet, getWalletTransactions } from '../../api/walletApi';
import { apiUrl, jsonResponse, installFetchMock } from './_helpers';

describe('walletApi.js', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  it('getWallet：GET /api/wallets/me/balance', async () => {
    await getWallet();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/wallets/me/balance'), expect.any(Object));
  });

  it('getWalletTransactions：預設 page=0', async () => {
    await getWalletTransactions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/wallets/me/transactions?page=0'), expect.any(Object));
  });

  it('getWalletTransactions(page)：帶指定頁碼', async () => {
    await getWalletTransactions(3);
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/wallets/me/transactions?page=3'), expect.any(Object));
  });

  it('getAllWalletTransactions：GET 全量明細 endpoint', async () => {
    await getAllWalletTransactions();
    expect(fetchMock).toHaveBeenLastCalledWith(apiUrl('/api/wallets/me/transactions/all'), expect.any(Object));
  });
});
