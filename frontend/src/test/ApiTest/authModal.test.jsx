import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthModal from '../../components/common/AuthModal';

describe('AuthModal', () => {
  it('登入頁籤顯示忘記密碼入口', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AuthModal open onClose={() => {}} initialTab="login" />
      </MemoryRouter>,
    );

    expect(markup).toContain('href="/auth/forgot-password"');
    expect(markup).toContain('忘記密碼？');
  });

  it('點擊忘記密碼時關閉登入視窗', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <AuthModal open onClose={onClose} initialTab="login" />
        </MemoryRouter>,
      );
    });

    await act(async () => container.querySelector('a[href="/auth/forgot-password"]').click());

    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});
