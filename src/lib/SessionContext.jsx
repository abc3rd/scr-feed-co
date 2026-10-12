import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearSession, onAuthLost } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('loading');
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const applyMe = ({ customer: c, needsName }) => {
    setCustomer(c); setError(''); setStatus(needsName ? 'needsName' : 'ready');
  };
  const signOut = () => {
    queryClient.clear(); setCustomer(null); setStatus('signedOut'); clearSession();
  };
  useEffect(() => {
    onAuthLost(() => { queryClient.clear(); setCustomer(null); setStatus('signedOut'); });
    return () => onAuthLost(null);
  }, [queryClient]);
  useEffect(() => {
    let active = true;
    if (isLoadingAuth || !authChecked) return;
    if (!isAuthenticated) { setCustomer(null); setStatus('signedOut'); return; }
    setStatus('loading');
    api.getMe().then((data) => { if (active) applyMe(data); }).catch((e) => {
      if (!active) return;
      setCustomer(null);
      if (e.status === 401) setStatus('signedOut');
      else { setError(e.message); setStatus('error'); }
    });
    return () => { active = false; };
  }, [isAuthenticated, isLoadingAuth, authChecked, retry]);
  return <SessionContext.Provider value={{ status, customer, error, applyMe, signOut, retry: () => setRetry((n) => n + 1) }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);
