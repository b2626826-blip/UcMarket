function resolveCell(column, row) {
  if (typeof column.render === "function") {
    return column.render(row);
  }

  return row[column.key] ?? "-";
}

export function renderAdminDataTable({ title, columns, rows, emptyText = "目前沒有資料" }) {
  if (!rows.length) {
    return `
      <section class="block-card shadow-sm">
        <div class="block-header">${title}</div>
        <div class="block-body">
          <div class="text-secondary">${emptyText}</div>
        </div>
      </section>
    `;
  }

  return `
    <section class="block-card shadow-sm">
      <div class="block-header">${title}</div>
      <div class="block-body p-0">
        <div class="table-responsive">
          <table class="table align-middle mb-0 admin-data-table">
            <thead class="table-light">
              <tr>
                ${columns.map((column) => `<th class="${column.headClass || ""}">${column.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      ${columns
                        .map(
                          (column) => `
                            <td class="${column.cellClass || ""}">
                              ${resolveCell(column, row)}
                            </td>
                          `
                        )
                        .join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}
