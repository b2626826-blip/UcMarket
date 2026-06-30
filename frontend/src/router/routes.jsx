import { createBrowserRouter, Navigate } from "react-router-dom";

import UserLayout from "../components/layout/UserLayout";
import AdminLayout from "../components/layout/AdminLayout";
import AuthGuard from "./AuthGuard";
import AdminGuard from "./AdminGuard";
import HomePage from "../pages/public/home";
import LoginPage from "../pages/public/login/LoginPage";
import RegisterPage from "../pages/public/register/RegisterPage";
import MarketDetailPage from "../pages/public/market-detail";
import PortfolioPage from "../pages/member/portfolio";
import WalletPage from "../pages/member/wallet";
import PositionsPage from "../pages/member/positions";
import TradeHistoryPage from "../pages/member/trade-history";
import RankingsPage from "../pages/member/rankings";
import CreateMarketPage from "../pages/member/create-market";

import DashboardPage from "../pages/admin/dashboard";
import MarketsPage from "../pages/admin/markets";
import CreateMarketAdminPage from "../pages/admin/markets/create";
import UsersPage from "../pages/admin/users";
import AdminsPage from "../pages/admin/admins";
import TransactionsPage from "../pages/admin/transactions";
import SettingsPage from "../pages/admin/settings";
import LogsPage from "../pages/admin/logs";
import AdminLoginPage from "../pages/admin/login";

const router = createBrowserRouter([
  {
    path: "/",
    element: <UserLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "markets", element: <HomePage /> },
      { path: "markets/:id", element: <MarketDetailPage /> },
      { path: "auth/login", element: <LoginPage /> },
      { path: "auth/register", element: <RegisterPage /> },
      { path: "rankings", element: <RankingsPage /> },
      { path: "portfolio", element: (<AuthGuard><PortfolioPage /></AuthGuard>) },
      { path: "wallet", element: (<AuthGuard><WalletPage /></AuthGuard>) },
      { path: "positions", element: (<AuthGuard><PositionsPage /></AuthGuard>) },
      { path: "trades", element: (<AuthGuard><TradeHistoryPage /></AuthGuard>) },
      { path: "markets/new", element: (<AuthGuard><CreateMarketPage /></AuthGuard>) },
    ],
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    path: "/admin",
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "markets", element: <MarketsPage /> },
      { path: "markets/create", element: <CreateMarketAdminPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "admins", element: <AdminsPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "logs", element: <LogsPage /> },
    ],
  },
]);

export default router;
