import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AuthGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return <p>登入狀態確認中...</p>;
  }

  return user ? children : <Navigate to="/" replace />;
}
