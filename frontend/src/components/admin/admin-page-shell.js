export function renderAdminPageHeader({ title, description }) {
  return `
    <section class="admin-page-header mb-3">
      <h1 class="h3 mb-1">${title}</h1>
      <p class="text-secondary mb-0">${description}</p>
    </section>
  `;
}

export function renderAdminSummaryCards(items) {
  return `
    <section class="admin-kpi-row mb-3">
      ${items
        .map(
          (item) => `
            <article class="admin-kpi-card shadow-sm">
              <div class="small text-secondary mb-2">${item.label}</div>
              <div class="h4 mb-0 text-${item.tone || "primary"}">${item.value}</div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}
