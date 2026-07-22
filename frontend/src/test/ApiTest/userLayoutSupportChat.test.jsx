import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UserLayout from '../../components/layout/UserLayout';

vi.mock('../../store/authStore', () => ({
  default: (selector) => selector({
    user: null,
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

vi.mock('../../components/common/AuthModal', () => ({ default: () => null }));
vi.mock('../../components/common/Toast', () => ({ default: () => null }));
vi.mock('../../components/support/SupportChatWidget', () => ({
  default: () => <div data-testid="support-chat" />,
}));

function renderLayout(path) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<UserLayout />}>
          <Route path="/" element={<div>歡迎頁</div>} />
          <Route path="/home" element={<div>市場頁</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('UserLayout 客服顯示範圍', () => {
  it('歡迎頁不渲染客服', () => {
    expect(renderLayout('/')).not.toContain('data-testid="support-chat"');
  });

  it('市場頁保留客服', () => {
    expect(renderLayout('/home')).toContain('data-testid="support-chat"');
  });
});
