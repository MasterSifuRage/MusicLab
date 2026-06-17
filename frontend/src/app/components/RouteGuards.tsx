import { Navigate } from "react-router";
import { useAuthStore } from "../../store/authStore";
import type { UserRole } from "../../types";

/** Requires any signed-in user; otherwise redirects to login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Requires a signed-in user with a specific role. */
export function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** For guest-only pages (login/signup): send authed users to their home. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return <>{children}</>;
}
