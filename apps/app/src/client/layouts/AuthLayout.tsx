import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/client/stores/index";

function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AuthLayout;
