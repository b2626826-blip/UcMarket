import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ucLogoIcon from '../../assets/logos/uclogoicon.png';
import SupportChatWidget from '../../components/support/SupportChatWidget';

vi.mock('../../store/authStore', () => ({
  default: (selector) => selector({ user: null }),
}));

describe('SupportChatWidget', () => {
  let container;
  let root;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.requestAnimationFrame = (callback) => callback();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SupportChatWidget />
        </MemoryRouter>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('使用 UcMarket logo 作為客服頭貼', async () => {
    await act(async () => container.querySelector('.support-chat__fab').click());

    const avatar = container.querySelector('.support-chat__avatar-image');
    expect(avatar).not.toBeNull();
    expect(avatar.getAttribute('src')).toBe(ucLogoIcon);
  });
});
