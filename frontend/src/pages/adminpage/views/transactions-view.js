import { fetchAdminTransactions } from "../../../api/admin/review-api.js";
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

function sideBadge(side) {
  if (side === "yes") {
    return '<span class="status-badge status-active">YES</span>';
  }
  return '<span class="status-badge status-closed">NO</span>';
}

function txStatusBadge(status) {
  const map = {
    completed: { cls: "status-approved", label: "完成" },
    flagged: { cls: "status-rejected", label: "異常" },
    refunded: { cls: "status-pending", label: "退款" }
  };
  const item = map[status] || { cls: "status-closed", label: status };
  return `<span class="status-badge ${item.cls}">${item.label}</span>`;
}

function filterTransactions(items, filters) {
  return items.filter((tx) => {
    const byKeyword =
      !filters.keyword ||
      `${tx.id} ${tx.username} ${tx.marketId}`.toLowerCase().includes(filters.keyword.toLowerCase());
    const byStatus = !filters.status || tx.status === filters.status;
    const bySide = !filters.side || tx.side === filters.side;

    return byKeyword && byStatus && bySide;
  });
}

export async function renderTransactionsView(container) {
  const data = await fetchAdminTransactions();

  container.innerHTML = `
    ${renderAdminPageHeader({
      title: "交易紀錄",
      description: "檢視即時成交、異常交易標記與退款紀錄。"
    })}
    ${renderAdminSummaryCards(data.summary)}
    ${renderAdminFilterBar({
      fields: [
        { key: "keyword", label: "關鍵字", type: "search", placeholder: "搜尋交易編號、帳號、事件編號" },
        {
          key: "status",
          label: "交易狀態",
          type: "select",
          options: [
            { label: "全部狀態", value: "" },
            { label: "完成", value: "completed" },
            { label: "異常", value: "flagged" },
            { label: "退款", value: "refunded" }
          ]
        },
        {
          key: "side",
          label: "方向",
          type: "select",
          options: [
            { label: "全部方向", value: "" },
            { label: "YES", value: "yes" },
            { label: "NO", value: "no" }
          ]
        }
      ]
    })}
    <div data-table-slot></div>
  `;

  const tableSlot = container.querySelector("[data-table-slot]");
  const filterForm = container.querySelector("[data-admin-filter-form]");
  const resetButton = container.querySelector("[data-filter-reset]");

  const columns = [
    { key: "id", label: "交易編號", headClass: "ps-3", cellClass: "ps-3 fw-semibold" },
    { key: "username", label: "帳號" },
    { key: "marketId", label: "事件編號" },
    { key: "side", label: "方向", render: (row) => sideBadge(row.side) },
    { key: "amount", label: "金額" },
    { key: "price", label: "成交價" },
    { key: "createdAt", label: "成交時間" },
    { key: "status", label: "狀態", render: (row) => txStatusBadge(row.status) }
  ];

  function draw() {
    const filters = getFilterValues(filterForm);
    const rows = filterTransactions(data.transactions, filters);

    tableSlot.innerHTML = renderAdminDataTable({
      title: `交易資料 (${rows.length})`,
      columns,
      rows,
      emptyText: "找不到符合條件的交易。"
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
