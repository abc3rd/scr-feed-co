import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function SignInFlow() {
  const location = useLocation();
  const returnTo = location.pathname + location.search;
  return (
    <div className="pt-4 space-y-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Feed · Hay · Bedding</p>
      <h1 className="font-heading text-5xl leading-none">Order ahead. Pick up fast.</h1>
      <p className="text-muted-foreground">Sign in to view your account and orders.</p>
      <button type="button" onClick={() => base44.auth.loginWithProvider('google', returnTo)} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold">Continue with Google</button>
      <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="flex items-center justify-center w-full h-14 rounded-2xl border-2 border-input bg-card font-bold">Sign in with email</Link>
      <Link to={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="inline-block text-primary underline">Create an account</Link>
    </div>
  );
}
