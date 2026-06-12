import { fetchAdminDashboard } from "../../../api/admin/review-api.js";
import { renderStatsCards } from "../../../components/admin/stats-cards.js";
import { renderReviewTable } from "../../../components/admin/review-table.js";
import { renderQuickPanel } from "../../../components/admin/quick-panel.js";

export async function renderDashboardView(container) {
  const data = await fetchAdminDashboard();

  container.innerHTML = `
    <section class="mb-3">
      <h1 class="h3 mb-1">事件審核</h1>
      <p class="text-secondary mb-0">審核使用者提交的事件，確保符合上架規則。</p>
    </section>
    ${renderStatsCards(data.stats)}
    <section class="page-grid align-items-start">
      <div>${renderReviewTable(data.reviews)}</div>
      <aside>${renderQuickPanel(data.quickActions, data.systemInfo)}</aside>
    </section>
  `;
}
