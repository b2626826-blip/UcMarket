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
