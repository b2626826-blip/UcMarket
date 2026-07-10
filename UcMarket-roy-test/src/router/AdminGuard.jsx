import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AdminGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || user?.userRole;
  // DEV 開發模式跳過後台登入驗證，方便前後端獨立開發。
  // 正式部署時註解此行，讓未登入用戶自動導向 /admin/login。
  if (import.meta.env.DEV && !user) {
    return children;
  }
  return role === "ADMIN" || role === "admin" ? children : <Navigate to="/admin/login" replace />;
}
