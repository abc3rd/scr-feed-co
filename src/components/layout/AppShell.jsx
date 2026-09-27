import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BottomNav from "@/components/layout/BottomNav";

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-4 focus:py-3 focus:rounded-xl">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1 w-full max-w-xl mx-auto px-4 pt-5 pb-28">
        <Outlet />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}