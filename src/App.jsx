import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import Orders from '@/pages/Orders';
import Join from '@/pages/Join';
import MemberLanding from '@/pages/MemberLanding';
import QrCodes from '@/pages/QrCodes';
import AssistantPage from '@/pages/AssistantPage';
import DeleteAccount from '@/pages/DeleteAccount';
import Placeholder from '@/pages/Placeholder';
const SitePerformance = lazy(() => import("@/pages/SitePerformance"));
import Profile from '@/pages/Profile';
import AppShell from '@/components/layout/AppShell';
import CustomerGate from '@/components/layout/CustomerGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SessionProvider } from '@/lib/SessionContext';
import { captureDeepLink } from '@/lib/deepLink';

captureDeepLink();

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/join" element={<Join />} />
        <Route path="/m/:token" element={<MemberLanding />} />
        <Route path="/qr" element={<QrCodes />} />
        <Route element={<AppShell />}>
          <Route path="/review" element={<Placeholder title="Review your order" />} />
          <Route path="/yard" element={<Placeholder title="Yard" note="Staff tools are coming in a later build." />} />
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route path="/seo" element={<Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>}><SitePerformance /></Suspense>} />
          </Route>
          <Route element={<CustomerGate />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/card" element={<Placeholder title="Card on file" />} />
            <Route path="/orders/:id" element={<Placeholder title="Order detail" />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </SessionProvider>
  );
};


function App() {
  useEffect(() => {
    document.title = "SCR Feed Co.";
    if (document.getElementById("scr-cookie-consent")) return;
    const script = document.createElement("script");
    script.id = "scr-cookie-consent";
    script.src = "https://scr-feed-app.vercel.app/legal/cookie-consent.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App