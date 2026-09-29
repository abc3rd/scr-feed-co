import { mockTransport, setMockSession } from "@/lib/mockApi";

// Single place for every server call.
export const API_BASE = "https://scr-feed-app.vercel.app/api/v1";
export const USE_MOCK = true;
export const STORES = ["LaBelle", "Fort Myers"];

const DEMO_CUSTOMER = {
  id: "cus_demo_scr",
  phone: "2395550142",
  firstName: "SCR",
  lastName: "Demo",
  email: "demo@scrfeedco.com",
  preferredStore: "LaBelle",
  card: { brand: "Visa", last4: "4242" },
};

const REFRESH_KEY = "scr_refresh_token";
let accessToken = null; // memory only
let authLostHandler = null;
let refreshInFlight = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function saveTokens(data) {
  accessToken = data.accessToken;
  if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
}

export function clearSession() {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}

export const hasStoredSession = () => !!localStorage.getItem(REFRESH_KEY);
export const onAuthLost = (fn) => { authLostHandler = fn; };

async function transport(method, path, body, headers = {}) {
  if (USE_MOCK) return mockTransport(method, path, body, headers);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function refreshSession() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = transport("POST", "/auth/refresh", { refreshToken })
      .then(({ status, data }) => {
        if (status < 300 && data.accessToken) { saveTokens(data); return true; }
        return false;
      })
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request(method, path, { body, auth = true } = {}) {
  const send = () =>
    transport(method, path, body, auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {});
  let res = await send();
  if (auth && res.status === 401) {
    if (await refreshSession()) res = await send();
    if (res.status === 401) {
      clearSession();
      authLostHandler?.();
      throw new ApiError("Your session ended. Please sign in again.", 401);
    }
  }
  if (res.status >= 400) throw new ApiError(res.data?.error || "Something went wrong. Please try again.", res.status);
  return res.data;
}

export const api = {
  sendCode: (phone) => request("POST", "/auth/send-code", { body: { phone }, auth: false }),
  demoSignIn: () => {
    const data = {
      accessToken: `demo-access-${Date.now()}`,
      refreshToken: null,
      needsName: false,
      customer: DEMO_CUSTOMER,
    };
    accessToken = data.accessToken;
    if (USE_MOCK) setMockSession(data.accessToken);
    return data;
  },
  verifyCode: async (phone, code) => {
    const data = await request("POST", "/auth/verify", { body: { phone, code }, auth: false });
    saveTokens(data);
    return data;
  },
  getMe: () => request("GET", "/me"),
  updateMe: (profile) => request("PATCH", "/me", { body: profile }),
  getDashboard: (location) => request("GET", `/dashboard?location=${encodeURIComponent(location)}`),
  placeHold: (order) => request("POST", "/orders", { body: order }),
  deleteAccount: () => request("DELETE", "/me"),
  optIn: (data) => request("POST", "/optin", { body: data, auth: false }),
  getMemberByQr: (token) => request("GET", `/members/qr/${encodeURIComponent(token)}`, { auth: false }),
  getMyQr: () => request("GET", "/me/qr"),
};