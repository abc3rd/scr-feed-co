// Lightweight per-tab navigation memory. Each bottom-nav tab remembers the last
// route visited within it, so switching back to a tab restores where you left off
// (its "stack top"), and double-tapping the active tab resets it to its root.

const TAB_ROOTS = ["/", "/seo", "/profile"];
const tabLocation = { "/": "/", "/seo": "/seo", "/profile": "/profile" };

// Map a route to the tab that owns it. Child screens belong to their parent tab.
export function tabForPath(pathname) {
  if (pathname === "/" || pathname.startsWith("/orders")) return "/";
  if (pathname === "/profile" || pathname.startsWith("/card")) return "/profile";
  if (pathname === "/seo") return "/seo";
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