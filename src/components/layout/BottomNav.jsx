import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart3, User } from "lucide-react";
import { tabForPath, getTabLocation, setTabLocation, resetTab } from "@/lib/tabStack";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/seo", label: "Performance", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabForPath(location.pathname);
  const lastTap = useRef(0);

  // Remember the current route as the active tab's last location.
  useEffect(() => {
    if (activeTab) setTabLocation(activeTab, location.pathname);
  }, [activeTab, location.pathname]);

  const handleTabClick = (tab) => {
    if (tab === activeTab) {
      // Double-tap the active tab to reset it to its root.
      const now = Date.now();
      if (now - lastTap.current < 350) {
        resetTab(tab);
        navigate(tab);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    } else {
      // Switch to the tab, restoring its last location (stack top).
      navigate(getTabLocation(tab));
    }
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur safe-area-bottom select-none"
    >
      <div className="max-w-xl mx-auto grid grid-cols-3">
        {TABS.map(({ to, label, icon: Icon }) => {
          const isActive = activeTab === to;
          return (
            <button
              key={to}
              type="button"
              onClick={() => handleTabClick(to)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomNavActive"
                  className="absolute inset-x-3 inset-y-1.5 rounded-xl bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="h-5 w-5 relative z-10" aria-hidden="true" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}