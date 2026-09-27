import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearSession, hasStoredSession, onAuthLost } from "@/lib/api";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [status, setStatus] = useState("loading"); // loading | signedOut | needsName | ready
  const [customer, setCustomer] = useState(null);

  const applyMe = ({ customer: c, needsName }) => {
    setCustomer(c);
    setStatus(needsName ? "needsName" : "ready");
  };

  const signOut = () => {
    clearSession();
    setCustomer(null);
    setStatus("signedOut");
  };

  useEffect(() => {
    onAuthLost(() => { setCustomer(null); setStatus("signedOut"); });
    if (!hasStoredSession()) { setStatus("signedOut"); return; }
    api.getMe().then(applyMe).catch(() => setStatus("signedOut"));
  }, []);

  return (
    <SessionContext.Provider value={{ status, customer, applyMe, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);