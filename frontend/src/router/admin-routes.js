import { renderDashboardView } from "../pages/adminpage/views/dashboard-view.js";
import { renderPlaceholderView } from "../pages/adminpage/views/placeholder-view.js";
import { renderMarketsView } from "../pages/adminpage/views/markets-view.js";
import { renderUsersView } from "../pages/adminpage/views/users-view.js";
import { renderTransactionsView } from "../pages/adminpage/views/transactions-view.js";

export const adminRoutes = [
  {
    path: "/admin/dashboard",
    label: "事件審核",
    icon: "bi-clock-history",
    meta: { requiresAdmin: true },
    view: renderDashboardView
  },
  {
    path: "/admin/markets",
    label: "事件列表",
    icon: "bi-card-list",
    meta: { requiresAdmin: true },
    view: renderMarketsView
  },
  {
    path: "/admin/create-market",
    label: "建立事件",
    icon: "bi-plus-square",
    meta: { requiresAdmin: true },
    view: (container) => renderPlaceholderView(container, "建立事件", "這裡預留後台代建市場與草稿修正流程。")
  },
  {
    path: "/admin/users",
    label: "用戶清單",
    icon: "bi-people",
    meta: { requiresAdmin: true },
    view: renderUsersView
  },
  {
    path: "/admin/admins",
    label: "管理員清單",
    icon: "bi-person-badge",
    meta: { requiresAdmin: true },
    view: (container) => renderPlaceholderView(container, "管理員清單", "之後放管理員帳號、角色與權限矩陣。")
  },
  {
    path: "/admin/transactions",
    label: "交易紀錄",
    icon: "bi-receipt",
    meta: { requiresAdmin: true },
    view: renderTransactionsView
  },
  {
    path: "/admin/settings",
    label: "系統設定",
    icon: "bi-gear",
    meta: { requiresAdmin: true },
    view: (container) => renderPlaceholderView(container, "系統設定", "之後放通知、審核規則與系統參數。")
  },
  {
    path: "/admin/logs",
    label: "操作日誌",
    icon: "bi-journal-text",
    meta: { requiresAdmin: true },
    view: (container) => renderPlaceholderView(container, "操作日誌", "之後放審核、結算與管理行為軌跡。")
  }
];
