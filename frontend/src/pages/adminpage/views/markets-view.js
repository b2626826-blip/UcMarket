import { fetchAdminMarkets } from "../../../api/admin/review-api.js";
import { renderAdminDataTable } from "../../../components/admin/admin-data-table.js";
import {
  getFilterValues,
  renderAdminFilterBar,
  resetFilterValues
} from "../../../components/admin/admin-filters.js";
import {
  renderAdminPageHeader,
  renderAdminSummaryCards
} from "../../../components/admin/admin-page-shell.js";

function statusBadge(status) {
  const map = {
    pending: "status-pending",
    active: "status-active",
    closed: "status-closed",
    resolved: "status-approved"
  };
  const labelMap = {
    pending: "待審核",
    active: "進行中",
    closed: "已截止",
    resolved: "已結算"
  };

  return `<span class="status-badge ${map[status] || "status-closed"}">${labelMap[status] || status}</span>`;
}

function filterMarkets(markets, filters) {
  return markets.filter((market) => {
    const byKeyword =
      !filters.keyword ||
      `${market.id} ${market.title} ${market.creator}`.toLowerCase().includes(filters.keyword.toLowerCase());
    const byStatus = !filters.status || market.status === filters.status;
    const byCategory = !filters.category || market.category === filters.category;

    return byKeyword && byStatus && byCategory;
  });
}

export async function renderMarketsView(container) {
  const data = await fetchAdminMarkets();
  const categories = [...new Set(data.markets.map((market) => market.category))];

  container.innerHTML = `
    ${renderAdminPageHeader({
      title: "事件列表",
      description: "集中管理市場狀態、截止時間與交易量。"
    })}
    ${renderAdminSummaryCards(data.summary)}
    ${renderAdminFilterBar({
      fields: [
        { key: "keyword", label: "關鍵字", type: "search", placeholder: "搜尋事件編號、標題、建立者" },
        {
          key: "status",
          label: "狀態",
          type: "select",
          options: [
            { label: "全部狀態", value: "" },
            { label: "待審核", value: "pending" },
            { label: "進行中", value: "active" },
            { label: "已截止", value: "closed" },
            { label: "已結算", value: "resolved" }
          ]
        },
        {
          key: "category",
          label: "分類",
          type: "select",
          options: [{ label: "全部分類", value: "" }, ...categories.map((item) => ({ label: item, value: item }))]
        }
      ]
    })}
    <div data-table-slot></div>
  `;

  const tableSlot = container.querySelector("[data-table-slot]");
  const filterForm = container.querySelector("[data-admin-filter-form]");
  const resetButton = container.querySelector("[data-filter-reset]");

  const columns = [
    { key: "id", label: "事件編號", headClass: "ps-3", cellClass: "ps-3 fw-semibold" },
    { key: "title", label: "標題" },
    { key: "category", label: "分類" },
    { key: "creator", label: "建立者" },
    { key: "closeAt", label: "截止日" },
    { key: "volume", label: "交易量" },
    {
      key: "status",
      label: "狀態",
      render: (row) => statusBadge(row.status)
    }
  ];

  function draw() {
    const filters = getFilterValues(filterForm);
    const rows = filterMarkets(data.markets, filters);

    tableSlot.innerHTML = renderAdminDataTable({
      title: `事件資料 (${rows.length})`,
      columns,
      rows,
      emptyText: "找不到符合條件的事件。"
    });
  }

  filterForm.addEventListener("input", draw);
  filterForm.addEventListener("change", draw);
  resetButton.addEventListener("click", () => {
    resetFilterValues(filterForm);
    draw();
  });

  draw();
}
