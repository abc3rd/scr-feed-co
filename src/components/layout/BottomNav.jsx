import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart3, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/seo", label: "Performance", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur safe-area-bottom select-none"
    >
      <div className="max-w-xl mx-auto grid grid-cols-3">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottomNavActive"
                    className="absolute inset-x-3 inset-y-1.5 rounded-xl bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-5 w-5 relative z-10" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}