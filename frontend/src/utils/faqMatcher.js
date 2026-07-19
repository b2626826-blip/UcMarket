import { SUPPORT_FAQ, SUPPORT_FALLBACK } from '../data/supportFaq';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 簡易關鍵字計分匹配（非 embedding / RAG）
 * @param {string} userText
 * @param {{ items?: typeof SUPPORT_FAQ, minScore?: number }} [options]
 * @returns {{ matched: boolean, item: object | null, answer: string, score: number, suggestions: object[] }}
 */
export function matchFaq(userText, options = {}) {
  const items = options.items || SUPPORT_FAQ;
  const minScore = options.minScore ?? 1;
  const q = normalize(userText);

  if (!q) {
    return {
      matched: false,
      item: null,
      answer: SUPPORT_FALLBACK,
      score: 0,
      suggestions: items.slice(0, 3),
    };
  }

  let best = null;
  let bestScore = 0;

  for (const item of items) {
    let score = 0;
    const questionNorm = normalize(item.question);
    if (questionNorm && (q === questionNorm || q.includes(questionNorm) || questionNorm.includes(q))) {
      score += 10;
    }
    for (const kw of item.keywords || []) {
      const k = normalize(kw);
      if (!k) continue;
      if (q.includes(k)) score += k.length >= 4 ? 3 : 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < minScore) {
    return {
      matched: false,
      item: null,
      answer: SUPPORT_FALLBACK,
      score: bestScore,
      suggestions: items.slice(0, 3),
    };
  }

  return {
    matched: true,
    item: best,
    answer: best.answer,
    score: bestScore,
    suggestions: items.filter((i) => i.id !== best.id).slice(0, 3),
  };
}
