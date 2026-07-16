export default function Pagination({ page, totalPages, totalElements, onChange, disabled }) {
  if (!totalPages || totalPages <= 1) {
    return totalElements != null ? (
      <div className="admin-pagination">
        <span className="admin-pagination__meta">共 {totalElements} 筆</span>
      </div>
    ) : null;
  }

  const cur = Math.min(Math.max(page, 0), totalPages - 1);
  const canPrev = cur > 0 && !disabled;
  const canNext = cur < totalPages - 1 && !disabled;

  return (
    <div className="admin-pagination">
      <span className="admin-pagination__meta">
        第 {cur + 1} / {totalPages} 頁 · 共 {totalElements ?? 0} 筆
      </span>
      <div className="admin-pagination__btns">
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!canPrev} onClick={() => onChange(cur - 1)}>
          上一頁
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!canNext} onClick={() => onChange(cur + 1)}>
          下一頁
        </button>
      </div>
    </div>
  );
}
