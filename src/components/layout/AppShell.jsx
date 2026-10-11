import React from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BottomNav from "@/components/layout/BottomNav";

const variants = {
  push: { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 } },
  pop: { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 } },
  replace: { initial: { opacity: 0 }, animate: { opacity: 1 } },
};

export default function AppShell() {
  const location = useLocation();
  const navType = useNavigationType();
  const variant = navType === "POP" ? variants.pop : navType === "REPLACE" ? variants.replace : variants.push;
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-4 focus:py-3 focus:rounded-xl">
        Skip to content
      </a>
      {["/", "/orders", "/profile", "/seo"].includes(location.pathname) && <SiteHeader />}
      <main id="main" className="flex-1 w-full max-w-xl mx-auto px-4 pt-5 pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={variant.initial}
            animate={variant.animate}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}