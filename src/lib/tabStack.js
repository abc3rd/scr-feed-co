// Lightweight per-tab navigation memory. Each bottom-nav tab remembers the last
// route visited within it, so switching back to a tab restores where you left off
// (its "stack top"), and double-tapping the active tab resets it to its root.

const TAB_ROOTS = ["/", "/orders", "/profile", "/seo", "/yard"];
const tabLocation = { "/": "/", "/orders": "/orders", "/profile": "/profile", "/seo": "/seo", "/yard": "/yard" };

// Map a route to the tab that owns it. Child screens belong to their parent tab.
export function tabForPath(pathname) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/orders")) return "/orders";
  if (pathname === "/profile" || pathname.startsWith("/card")) return "/profile";
  if (["/seo", "/yard", "/inventory"].includes(pathname)) return "/yard";
  if (pathname === "/assistant") return "/";
  return null;
}

export function getTabLocation(tab) {
  return tabLocation[tab] ?? tab;
}

export function setTabLocation(tab, path) {
  if (TAB_ROOTS.includes(tab)) tabLocation[tab] = path;
}

export function resetTab(tab) {
  if (TAB_ROOTS.includes(tab)) tabLocation[tab] = tab;
}