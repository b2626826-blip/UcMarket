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
import PendingMarketsPage from "../pages/admin/pending-markets";
import MarketReviewPage from "../pages/admin/market-review";
import MarketResolutionPage from "../pages/admin/market-resolution";
import UsersPage from "../pages/admin/users";
import AdminLogsPage from "../pages/admin/admin-logs";
import SettingsPage from "../pages/admin/settings";
import TransactionsPage from "../pages/admin/transactions";
import AdminCreateMarketPage from "../pages/admin/create-market";

const router = createBrowserRouter([
  {
    path: "/",
    element: <UserLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "markets",
        element: <HomePage />,
      },
      {
        path: "markets/:id",
        element: <MarketDetailPage />,
      },
      {
        path: "auth/login",
        element: <LoginPage />,
      },
      {
        path: "auth/register",
        element: <RegisterPage />,
      },
      {
        path: "rankings",
        element: <RankingsPage />,
      },
      {
        path: "portfolio",
        element: (
          <AuthGuard>
            <PortfolioPage />
          </AuthGuard>
        ),
      },
      {
        path: "wallet",
        element: (
          <AuthGuard>
            <WalletPage />
          </AuthGuard>
        ),
      },
      {
        path: "positions",
        element: (
          <AuthGuard>
            <PositionsPage />
          </AuthGuard>
        ),
      },
      {
        path: "trades",
        element: (
          <AuthGuard>
            <TradeHistoryPage />
          </AuthGuard>
        ),
      },
      {
        path: "markets/new",
        element: (
          <AuthGuard>
            <CreateMarketPage />
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="pending-markets" replace />,
      },
      {
        path: "pending-markets",
        element: <PendingMarketsPage />,
      },
      {
        path: "markets/review/:id",
        element: <MarketReviewPage />,
      },
      {
        path: "markets/resolve/:id",
        element: <MarketResolutionPage />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "logs",
        element: <AdminLogsPage />,
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
      },
      {
        path: "create-market",
        element: <AdminCreateMarketPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);

export default router;
