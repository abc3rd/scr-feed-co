import React from "react";
import { Outlet } from "react-router-dom";
import { useSession } from "@/lib/SessionContext";
import SignInFlow from "@/components/auth/SignInFlow";
import ProfileStep from "@/components/auth/ProfileStep";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

export default function CustomerGate() {
  const { status } = useSession();
  if (status === "loading") return <DashboardSkeleton />;
  if (status === "signedOut") return <SignInFlow />;
  if (status === "needsName") return <ProfileStep />;
  return <Outlet />;
}