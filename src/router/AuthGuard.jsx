import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AuthGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  return user ? children : <Navigate to="/" replace />;
}
