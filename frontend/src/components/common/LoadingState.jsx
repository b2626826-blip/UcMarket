/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
export default function LoadingState({ text = '載入中...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
      <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--gold)', marginBottom: 16 }}></i>
      <p>{text}</p>
    </div>
  );
}
