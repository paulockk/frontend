import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function AccessGuard({ children, permission, adminOnly = false }: { children: ReactNode; permission?: string; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return children;
  if (adminOnly || !permission || !user?.permissions.includes(permission)) return <Navigate to="/dashboard" replace />;
  return children;
}
