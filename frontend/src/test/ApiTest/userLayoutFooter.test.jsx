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

describe('UserLayout 手機版頁尾選單', () => {
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
