function actionButton(label, className) {
  return `<button type="button" class="btn btn-sm ${className}">${label}</button>`;
}

export function renderReviewTable(rows) {
  return `
    <section class="block-card shadow-sm">
      <div class="block-header">待審核事件列表</div>
      <div class="block-body p-0">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">標題</th>
                <th>提交者</th>
                <th>提交時間</th>
                <th>類別</th>
                <th>截止時間</th>
                <th class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td class="ps-3">${row.title}</td>
                      <td>${row.creator}</td>
                      <td>${row.submittedAt}</td>
                      <td><span class="status-badge status-pending">${row.category}</span></td>
                      <td>${row.closeAt}</td>
                      <td>
                        <div class="table-actions justify-content-center">
                          ${actionButton("檢視", "btn-outline-secondary")}
                          ${actionButton("核准", "btn-outline-success")}
                          ${actionButton("拒絕", "btn-outline-danger")}
                        </div>
                      </td>
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
