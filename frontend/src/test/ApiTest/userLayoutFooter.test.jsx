import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserLayout from '../../components/layout/UserLayout';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null,
    logout: vi.fn(),
    checkAuth: vi.fn(),
  },
}));

vi.mock('../../store/authStore', () => ({
  default: (selector) => selector(mocks.authState),
}));

vi.mock('../../components/common/AuthModal', () => ({ default: () => null }));
vi.mock('../../components/common/Toast', () => ({ default: () => null }));

describe('UserLayout 導覽與手機版頁尾選單', () => {
  let container;
  let root;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.scrollTo = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route element={<UserLayout />}>
              <Route path="/home" element={<div>首頁</div>} />
              <Route path="/rankings" element={<div>排行榜頁</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('在市場頁再次點擊市場時回到頁首', async () => {
    window.scrollTo.mockClear();
    const marketLink = Array.from(container.querySelectorAll('.nav-menu a'))
      .find((link) => link.textContent === '市場');

    await act(async () => marketLink.click());

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('在其他頁點擊市場時維持跳轉到市場頁', async () => {
    await act(async () => container.querySelector('.nav-menu a[href="/rankings"]').click());
    expect(container.textContent).toContain('排行榜頁');

    await act(async () => container.querySelector('.nav-menu a[href="/home"]').click());
    expect(container.textContent).toContain('首頁');
  });

  it('點擊標題時只展開該組連結', async () => {
    const platformButton = container.querySelector('[aria-controls="footer-section-platform"]');
    const resourcesButton = container.querySelector('[aria-controls="footer-section-resources"]');

    expect(platformButton.getAttribute('aria-expanded')).toBe('false');
    expect(resourcesButton.getAttribute('aria-expanded')).toBe('false');

    await act(async () => platformButton.click());
    expect(platformButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#footer-section-platform').classList).toContain('is-open');

    await act(async () => resourcesButton.click());
    expect(platformButton.getAttribute('aria-expanded')).toBe('false');
    expect(resourcesButton.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#footer-section-resources').classList).toContain('is-open');
  });
});
