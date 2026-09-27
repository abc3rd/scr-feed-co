import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BottomNav from "@/components/layout/BottomNav";

export default function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-4 focus:py-3 focus:rounded-xl">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1 w-full max-w-xl mx-auto px-4 pt-5 pb-28">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}