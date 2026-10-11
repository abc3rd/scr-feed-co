import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/SessionContext';
import ProfileStep from '@/components/auth/ProfileStep';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
export default function CustomerGate() {
  const { status, error, retry } = useSession();
  const location = useLocation();
  if (status === 'loading') return <DashboardSkeleton />;
  if (status === 'signedOut') return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (status === 'error') return <div role="alert" className="rounded-2xl bg-card border border-border p-5"><p>{error}</p><button onClick={retry} className="mt-4 h-12 px-5 bg-primary text-primary-foreground rounded-xl">Try again</button></div>;
  if (status === 'needsName') return <ProfileStep />;
  return <Outlet />;
}
