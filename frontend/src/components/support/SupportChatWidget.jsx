import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SUPPORT_FALLBACK,
  SUPPORT_QUICK_QUESTIONS,
  SUPPORT_WELCOME,
} from '../../data/supportFaq';
import useAuthStore from '../../store/authStore';
import { matchFaq } from '../../utils/faqMatcher';
import { safeInternalPath } from '../../utils/safeInternalPath';
import './SupportChatWidget.css';

function createMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    ...extra,
  };
}

export default function SupportChatWidget() {
  const panelId = useId();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => [
    createMessage('bot', SUPPORT_WELCOME, { showQuick: true }),
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const replyTimerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, typing]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
  }, []);

  const pushBotReply = useCallback((userText) => {
    setTyping(true);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);

    const delay = 350 + Math.floor(Math.random() * 250);
    replyTimerRef.current = setTimeout(() => {
      const result = matchFaq(userText);
      const botMsg = createMessage('bot', result.answer || SUPPORT_FALLBACK, {
        links: result.item?.links || [],
        suggestions: result.matched ? [] : (result.suggestions || []).map((s) => s.question),
      });
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
      replyTimerRef.current = null;
    }, delay);
  }, []);

  const sendText = useCallback((raw) => {
    const text = String(raw || '').trim();
    if (!text || typing) return;

    setMessages((prev) => [...prev, createMessage('user', text)]);
    setInput('');
    pushBotReply(text);
  }, [pushBotReply, typing]);

  const handleLink = useCallback((link) => {
    const path = safeInternalPath(link?.path);
    if (!path) return;

    setOpen(false);

    if (link.authRequired && !user) {
      navigate('/auth/login', { state: { from: path } });
      return;
    }

    navigate(path);
  }, [navigate, user]);

  const onSubmit = (e) => {
    e.preventDefault();
    sendText(input);
  };

  const toggle = () => setOpen((v) => !v);

  return (
    <div className={`support-chat${open ? ' support-chat--open' : ''}`}>
      {open && (
        <section
          id={panelId}
          className="support-chat__panel glass-card"
          role="dialog"
          aria-modal="false"
          aria-label="UcMarket 智能客服"
        >
          <header className="support-chat__header">
            <div className="support-chat__brand">
              <span className="support-chat__avatar" aria-hidden="true">
                <i className="fa-solid fa-sparkles" />
              </span>
              <div className="support-chat__header-text">
                <h2 className="support-chat__title">UcMarket 小幫手</h2>
                <p className="support-chat__status">
                  <span className="support-chat__status-dot" />
                  線上協助
                </p>
              </div>
            </div>
            <button
              type="button"
              className="support-chat__icon-btn"
              onClick={() => setOpen(false)}
              aria-label="關閉客服視窗"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </header>

          <div className="support-chat__messages" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`support-chat__bubble support-chat__bubble--${msg.role}`}
              >
                <p className="support-chat__bubble-text">{msg.text}</p>
                {msg.links?.length > 0 && (
                  <div className="support-chat__links">
                    {msg.links.map((link) => (
                      <button
                        key={`${link.path}-${link.label}`}
                        type="button"
                        className="support-chat__link"
                        onClick={() => handleLink(link)}
                      >
                        {link.authRequired && !user && (
                          <i className="fa-solid fa-lock support-chat__link-lock" aria-hidden="true" />
                        )}
                        <span>{link.label}</span>
                        <i className="fa-solid fa-arrow-right support-chat__link-arrow" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
                {msg.showQuick && (
                  <div className="support-chat__chips">
                    {SUPPORT_QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="support-chat__chip"
                        disabled={typing}
                        onClick={() => sendText(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {msg.suggestions?.length > 0 && (
                  <div className="support-chat__chips">
                    {msg.suggestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="support-chat__chip"
                        disabled={typing}
                        onClick={() => sendText(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div
                className="support-chat__bubble support-chat__bubble--bot support-chat__bubble--typing"
                aria-live="polite"
              >
                <span className="support-chat__dot" />
                <span className="support-chat__dot" />
                <span className="support-chat__dot" />
              </div>
            )}
          </div>

          <form className="support-chat__composer" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor={`${panelId}-input`}>
              輸入問題
            </label>
            <input
              id={`${panelId}-input`}
              ref={inputRef}
              className="support-chat__input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入關鍵字，例如：錢包、結算…"
              autoComplete="off"
              disabled={typing}
              maxLength={200}
            />
            <button
              type="submit"
              className="support-chat__send gold-button"
              disabled={typing || !input.trim()}
              aria-label="送出"
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="support-chat__fab"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? '關閉智能客服' : '開啟智能客服'}
      >
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-comments'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
