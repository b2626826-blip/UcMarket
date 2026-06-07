import { apiRequest } from "../client.js";

const dashboardMock = {
  stats: [
    { label: "待審核事件", value: 12, tone: "primary", icon: "bi-clock-history" },
    { label: "已核准", value: 28, tone: "success", icon: "bi-check-circle" },
    { label: "已拒絕", value: 5, tone: "danger", icon: "bi-x-circle" },
    { label: "要求修改", value: 3, tone: "warning", icon: "bi-pencil-square" }
  ],
  reviews: [
    {
      id: "mk-001",
      title: "比特幣會在 2025 年底前突破 12 萬美元嗎？",
      creator: "user_1234",
      submittedAt: "2024-05-26 14:30",
      category: "加密貨幣",
      closeAt: "2025-12-31",
      status: "pending"
    },
    {
      id: "mk-002",
      title: "輝達 2024 Q3 財報營收會超過市場預期嗎？",
      creator: "trader_nick",
      submittedAt: "2024-05-26 13:15",
      category: "股票",
      closeAt: "2024-10-15",
      status: "pending"
    },
    {
      id: "mk-003",
      title: "台灣總統選舉投票率會超過 70%？",
      creator: "crypto_king",
      submittedAt: "2024-05-26 12:05",
      category: "政治",
      closeAt: "2024-01-13",
      status: "pending"
    },
    {
      id: "mk-004",
      title: "iPhone 16 會在 9 月發布嗎？",
      creator: "apple_fan",
      submittedAt: "2024-05-26 11:20",
      category: "科技",
      closeAt: "2024-09-30",
      status: "pending"
    }
  ],
  quickActions: [
    { label: "建立新事件", hint: "建立新的預測事件", route: "#/admin/create-market" },
    { label: "查看所有事件", hint: "管理所有事件", route: "#/admin/markets" },
    { label: "用戶清單", hint: "管理平台用戶", route: "#/admin/users" },
    { label: "系統設定", hint: "調整系統參數", route: "#/admin/settings" }
  ],
  systemInfo: [
    { label: "總用戶數", value: "1,248" },
    { label: "進行中事件", value: "86" },
    { label: "今日交易量", value: "12,345,678" },
    { label: "平台總點數", value: "98,765,432" },
    { label: "系統狀態", value: "正常運行" }
  ]
};

const marketsPageMock = {
  summary: [
    { label: "全部事件", value: 86, tone: "primary" },
    { label: "待審核", value: 12, tone: "warning" },
    { label: "進行中", value: 53, tone: "success" },
    { label: "已結算", value: 21, tone: "secondary" }
  ],
  markets: [
    {
      id: "MKT-240601",
      title: "BTC 是否會在 2026-06-30 前突破 120,000 美元？",
      category: "加密貨幣",
      creator: "crypto_king",
      status: "active",
      closeAt: "2026-06-30",
      volume: "4,280,000"
    },
    {
      id: "MKT-240602",
      title: "輝達下一季財報營收是否超過市場預期？",
      category: "股票",
      creator: "trader_nick",
      status: "pending",
      closeAt: "2026-07-15",
      volume: "1,125,000"
    },
    {
      id: "MKT-240603",
      title: "iPhone 18 是否於 9 月發表會亮相？",
      category: "科技",
      creator: "apple_fan",
      status: "active",
      closeAt: "2026-09-30",
      volume: "2,048,000"
    },
    {
      id: "MKT-240604",
      title: "台灣職棒總冠軍賽是否打滿七戰？",
      category: "體育",
      creator: "sports_analyzer",
      status: "resolved",
      closeAt: "2026-11-01",
      volume: "890,000"
    },
    {
      id: "MKT-240605",
      title: "美元指數是否在月底前站上 110？",
      category: "總經",
      creator: "macro_lover",
      status: "closed",
      closeAt: "2026-06-25",
      volume: "750,000"
    }
  ]
};

const usersPageMock = {
  summary: [
    { label: "總用戶", value: 1248, tone: "primary" },
    { label: "今日活躍", value: 327, tone: "success" },
    { label: "停權中", value: 9, tone: "danger" },
    { label: "待審核開盤者", value: 14, tone: "warning" }
  ],
  users: [
    {
      id: "USR-1001",
      username: "user_1234",
      role: "user",
      reputation: 78,
      status: "active",
      balance: "28,500",
      lastLogin: "2026-06-03 09:12"
    },
    {
      id: "USR-1002",
      username: "trader_nick",
      role: "user",
      reputation: 91,
      status: "active",
      balance: "35,040",
      lastLogin: "2026-06-03 08:41"
    },
    {
      id: "USR-1003",
      username: "apple_fan",
      role: "user",
      reputation: 63,
      status: "suspended",
      balance: "4,880",
      lastLogin: "2026-05-26 23:10"
    },
    {
      id: "USR-1004",
      username: "admin",
      role: "admin",
      reputation: 99,
      status: "active",
      balance: "--",
      lastLogin: "2026-06-03 10:01"
    },
    {
      id: "USR-1005",
      username: "market_maker",
      role: "user",
      reputation: 84,
      status: "active",
      balance: "18,230",
      lastLogin: "2026-06-02 22:34"
    }
  ]
};

const transactionsPageMock = {
  summary: [
    { label: "今日成交筆數", value: 268, tone: "primary" },
    { label: "今日成交量", value: "12,345,678", tone: "success" },
    { label: "異常交易", value: 4, tone: "danger" },
    { label: "退款筆數", value: 11, tone: "warning" }
  ],
  transactions: [
    {
      id: "TRX-240603-001",
      username: "crypto_king",
      marketId: "MKT-240601",
      side: "yes",
      amount: "3,000",
      price: "0.64",
      createdAt: "2026-06-03 09:40",
      status: "completed"
    },
    {
      id: "TRX-240603-002",
      username: "user_1234",
      marketId: "MKT-240602",
      side: "no",
      amount: "1,200",
      price: "0.42",
      createdAt: "2026-06-03 09:32",
      status: "completed"
    },
    {
      id: "TRX-240603-003",
      username: "trader_nick",
      marketId: "MKT-240603",
      side: "yes",
      amount: "8,500",
      price: "0.58",
      createdAt: "2026-06-03 09:18",
      status: "flagged"
    },
    {
      id: "TRX-240603-004",
      username: "market_maker",
      marketId: "MKT-240605",
      side: "no",
      amount: "2,050",
      price: "0.37",
      createdAt: "2026-06-03 08:57",
      status: "refunded"
    },
    {
      id: "TRX-240603-005",
      username: "apple_fan",
      marketId: "MKT-240604",
      side: "yes",
      amount: "980",
      price: "0.53",
      createdAt: "2026-06-03 08:36",
      status: "completed"
    }
  ]
};

export async function fetchAdminDashboard() {
  return apiRequest(async () => structuredClone(dashboardMock));
}

export async function fetchAdminMarkets() {
  return apiRequest(async () => structuredClone(marketsPageMock));
}

export async function fetchAdminUsers() {
  return apiRequest(async () => structuredClone(usersPageMock));
}

export async function fetchAdminTransactions() {
  return apiRequest(async () => structuredClone(transactionsPageMock));
}
