import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AdminGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || user?.userRole;
  if (import.meta.env.DEV && !user) {
    return children;
  }
  return role === "ADMIN" || role === "admin" ? children : <Navigate to="/" replace />;
}
