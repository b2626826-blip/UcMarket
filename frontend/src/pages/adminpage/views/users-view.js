import { fetchAdminUsers } from "../../../api/admin/review-api.js";
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

function roleBadge(role) {
  if (role === "admin") {
    return '<span class="status-badge status-active">管理員</span>';
  }
  return '<span class="status-badge status-closed">一般用戶</span>';
}

function accountStatusBadge(status) {
  if (status === "active") {
    return '<span class="status-badge status-active">正常</span>';
  }
  return '<span class="status-badge status-rejected">停權</span>';
}

function filterUsers(users, filters) {
  return users.filter((user) => {
    const byKeyword =
      !filters.keyword ||
      `${user.id} ${user.username}`.toLowerCase().includes(filters.keyword.toLowerCase());
    const byRole = !filters.role || user.role === filters.role;
    const byStatus = !filters.status || user.status === filters.status;

    return byKeyword && byRole && byStatus;
  });
}

export async function renderUsersView(container) {
  const data = await fetchAdminUsers();

  container.innerHTML = `
    ${renderAdminPageHeader({
      title: "用戶清單",
      description: "管理會員角色、帳戶狀態與最近登入活動。"
    })}
    ${renderAdminSummaryCards(data.summary)}
    ${renderAdminFilterBar({
      fields: [
        { key: "keyword", label: "關鍵字", type: "search", placeholder: "搜尋帳號編號、使用者名稱" },
        {
          key: "role",
          label: "角色",
          type: "select",
          options: [
            { label: "全部角色", value: "" },
            { label: "管理員", value: "admin" },
            { label: "一般用戶", value: "user" }
          ]
        },
        {
          key: "status",
          label: "帳戶狀態",
          type: "select",
          options: [
            { label: "全部狀態", value: "" },
            { label: "正常", value: "active" },
            { label: "停權", value: "suspended" }
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
    { key: "id", label: "帳號編號", headClass: "ps-3", cellClass: "ps-3 fw-semibold" },
    { key: "username", label: "使用者" },
    { key: "role", label: "角色", render: (row) => roleBadge(row.role) },
    { key: "status", label: "帳戶狀態", render: (row) => accountStatusBadge(row.status) },
    { key: "reputation", label: "聲望" },
    { key: "balance", label: "點數餘額" },
    { key: "lastLogin", label: "最後登入" }
  ];

  function draw() {
    const filters = getFilterValues(filterForm);
    const rows = filterUsers(data.users, filters);

    tableSlot.innerHTML = renderAdminDataTable({
      title: `用戶資料 (${rows.length})`,
      columns,
      rows,
      emptyText: "找不到符合條件的用戶。"
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
