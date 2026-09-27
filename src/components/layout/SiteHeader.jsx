import React from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useSession } from "@/lib/SessionContext";

export default function SiteHeader() {
  const { status, signOut } = useSession();
  const signedIn = status === "ready" || status === "needsName";

  return (
    <header className="bg-primary text-primary-foreground safe-area-top">
      <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-baseline gap-2 rounded min-w-0">
          <span className="font-heading text-3xl tracking-wider leading-none">SCR Feed Co.</span>
          <span className="hidden min-[400px]:inline text-xs uppercase tracking-[0.2em] opacity-75">Est. SWFL</span>
        </Link>
        {signedIn && (
          <button
            type="button"
            onClick={signOut}
            className="h-11 px-3 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}