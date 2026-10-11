import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
export default function StaffGate() {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <p role="status">Checking staff access…</p>;
  if (!isAuthenticated)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (user?.role !== "admin")
    return (
      <p role="alert" className="p-5 rounded-2xl bg-card border border-border">
        This area is for SCR store staff.
      </p>
    );
  return <Outlet />;
}
