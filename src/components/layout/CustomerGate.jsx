import React from "react";
import { Outlet } from "react-router-dom";
import { useSession } from "@/lib/SessionContext";
import SignInFlow from "@/components/auth/SignInFlow";
import ProfileStep from "@/components/auth/ProfileStep";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

export default function CustomerGate() {
  const { status, error, retry } = useSession();
  if (status === "loading") return <DashboardSkeleton />;
  if (status === "signedOut") return <SignInFlow />;
  if (status === "needsName") return <ProfileStep />;
  if (status === "error") return (
    <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
      <p>{error}</p>
      <button onClick={retry} className="min-h-12 rounded-2xl bg-primary px-6 text-primary-foreground">Try again</button>
    </div>
  );
  return <Outlet />;
}
