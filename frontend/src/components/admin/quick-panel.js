export function renderQuickPanel(actions, systemInfo) {
  return `
    <div class="d-grid gap-3">
      <section class="block-card shadow-sm">
        <div class="block-header">快速操作</div>
        <div class="block-body quick-actions">
          ${actions
            .map(
              (action) => `
                <a class="quick-action-btn text-decoration-none text-body" href="${action.route}">
                  <div class="fw-semibold mb-1">${action.label}</div>
                  <div class="small text-secondary">${action.hint}</div>
                </a>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="block-card shadow-sm">
        <div class="block-header">系統資訊</div>
        <div class="block-body system-list">
          ${systemInfo
            .map(
              (item) => `
                <div class="system-item">
                  <span class="text-secondary">${item.label}</span>
                  <span class="fw-semibold ${item.value === "正常運行" ? "text-success" : ""}">${item.value}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}
