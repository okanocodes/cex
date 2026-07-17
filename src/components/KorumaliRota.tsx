import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function KorumaliRota() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/giris" replace />;
  return <Outlet />;
}
