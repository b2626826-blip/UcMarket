export function renderStatsCards(items) {
  return `
    <section class="stats-row mb-3">
      ${items
        .map(
          (item) => `
            <article class="stat-card shadow-sm">
              <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div class="text-secondary small mb-2">${item.label}</div>
                  <div class="value">${item.value}</div>
                </div>
                <div class="fs-4 text-${item.tone}">
                  <i class="bi ${item.icon}"></i>
                </div>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}
