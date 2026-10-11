import React from "react";
import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import SiteFooter from "@/components/layout/SiteFooter";
export default function Join() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-2">
          <Sprout className="h-6 w-6" />
          <span className="font-heading text-3xl">SCR Feed Co.</span>
        </div>
      </header>
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Feed · Hay · Bedding
        </p>
        <h1 className="font-heading text-5xl">Order ahead. Pick up fast.</h1>
        <p>
          Choose your SCR store, browse its available products, and submit an
          order for pickup. Staff prepare your items and you pay at hand-off.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Create your account and choose your store.</li>
          <li>Add feed and supplies to your cart.</li>
          <li>Submit your order and follow its status in the app.</li>
        </ol>
        <Link
          to="/register?returnTo=%2F"
          className="block py-4 text-center bg-primary text-primary-foreground font-bold rounded-2xl"
        >
          Create account
        </Link>
        <Link
          to="/login?returnTo=%2F"
          className="block py-3 text-center border border-border rounded-xl"
        >
          Already a customer? Sign in
        </Link>
        <p className="text-sm text-muted-foreground">
          Text and email preferences are optional and available in Profile.
          Consent is not required to order.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
