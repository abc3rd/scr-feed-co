import React from "react";
import { Link } from "react-router-dom";
import BackHeader from "@/components/layout/BackHeader";
export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-background">
      <BackHeader title="Delete account" to="/" />
      <main className="max-w-xl mx-auto p-5 space-y-5">
        <h1 className="font-heading text-4xl">Delete your SCR account</h1>
        <p>
          Sign in, open Profile, and select Delete account. Cancel or complete
          any active orders first.
        </p>
        <p>
          Your personal store profile, contact preferences, favorites, member
          QR, and Base44 sign-in account are removed. Completed order lines
          remain without a customer identity for store accounting.
        </p>
        <p className="text-muted-foreground">
          If identity deletion cannot finish, the app reports it and lets you
          retry. It does not report success before both steps complete.
        </p>
        <Link
          to="/login?returnTo=%2Fprofile"
          className="block rounded-xl bg-primary text-primary-foreground p-4 text-center font-bold"
        >
          Sign in to manage your account
        </Link>
      </main>
    </div>
  );
}
