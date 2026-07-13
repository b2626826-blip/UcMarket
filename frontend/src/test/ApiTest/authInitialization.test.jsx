import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthGuard from '../../router/AuthGuard';
import useAuthStore from '../../store/authStore';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../api/authApi', () => ({
  getCurrentUser: mocks.getCurrentUser,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../api/oauthApi', () => ({ firebaseLogin: vi.fn() }));

vi.mock('../../api/client', () => ({
  getToken: mocks.getToken,
  setToken: vi.fn(),
}));

describe('登入狀態初始化', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: null, initialized: false, loading: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('驗證尚未完成時不把受保護頁面導回首頁', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/markets/new']}>
          <Routes>
            <Route
              path="/markets/new"
              element={<AuthGuard><div>建立市場頁</div></AuthGuard>}
            />
            <Route path="/" element={<div>公開首頁</div>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('登入狀態確認中');
    expect(container.textContent).not.toContain('公開首頁');
  });

  it('沒有 token 時完成驗證並標記 initialized', async () => {
    mocks.getToken.mockReturnValue(null);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().initialized).toBe(true);
  });
});
