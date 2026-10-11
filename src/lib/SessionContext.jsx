import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();
  const [status, setStatus] = useState("loading");
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const previousUser = useRef(null);
  const applyMe = useCallback(({ customer: next, needsName }) => {
    setCustomer(next);
    setStatus(needsName ? "needsName" : "ready");
    setError("");
  }, []);
  useEffect(() => {
    let active = true;
    // Do not cancel staff queries mounted during the first session load.
    if (previousUser.current && previousUser.current !== user?.id)
      queryClientInstance.clear();
    previousUser.current = user?.id || null;
    setCustomer(null);
    if (isLoadingAuth) {
      setStatus("loading");
      return;
    }
    if (!isAuthenticated) {
      setStatus("signedOut");
      return;
    }
    setStatus("loading");
    api
      .getMe()
      .then((data) => {
        if (active) applyMe(data);
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id, isAuthenticated, isLoadingAuth, applyMe]);
  const retry = async () => {
    setStatus("loading");
    try {
      applyMe(await api.getMe());
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };
  const signOut = ({ clearPlatformSession = true } = {}) => {
    queryClientInstance.clear();
    for (const key of [
      "scr_carts",
      "scr_checkout",
      "scr_pending_add",
      "scr_pending_reorder",
    ])
      sessionStorage.removeItem(key);
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith("scr_stock_move:")) sessionStorage.removeItem(key);
    for (const key of [
      "scr_refresh_token",
      "scr_mock_profile",
      "scr_mock_optin",
    ])
      localStorage.removeItem(key);
    setCustomer(null);
    setStatus("signedOut");
    if (clearPlatformSession) logout();
  };
  return (
    <SessionContext.Provider
      value={{ status, customer, error, applyMe, signOut, retry }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
