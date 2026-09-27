const KEY = "scr_pending_add";

// Captures ?sku=&loc= from a QR link before any sign-in redirect.
export function captureDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const sku = params.get("sku");
  if (!sku || window.location.pathname !== "/") return;
  sessionStorage.setItem(KEY, JSON.stringify({ sku, loc: params.get("loc") }));
  window.history.replaceState(null, "", "/");
}

export const readPendingAdd = () => JSON.parse(sessionStorage.getItem(KEY) || "null");
export const clearPendingAdd = () => sessionStorage.removeItem(KEY);