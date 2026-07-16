/**
 * ⚠️ 孤兒元件（ORPHAN，2026-07-08 盤點）— 全專案零引用，未被任何頁面 import。
 * 保留待日後接回使用或移除；若已重新啟用請刪除本註解。
 */
export default function AdminTable({ columns, rows, emptyText = '無資料', onRowClick }) {
  return (
    <div className="table-wrapper">
      <table className="table admin-data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.style}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>{emptyText}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : undefined }}>
              {columns.map((col) => (
                <td key={col.key} style={col.tdStyle}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
