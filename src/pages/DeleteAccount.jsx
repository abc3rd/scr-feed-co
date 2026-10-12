import React from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-background">
      <BackHeader title="Delete account" to="/" />
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl bg-card border border-border p-5">
          <h1 className="font-heading text-4xl leading-none">Delete your account</h1>
          <p className="text-muted-foreground mt-2">
            You can delete your SCR Feed Co. account at any time. Deletion is permanent and can't be undone.
          </p>
        </div>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h2 className="font-heading text-2xl tracking-wide">How to delete</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>Sign in to the app.</li>
            <li>Open <strong>Profile</strong> from the bottom menu.</li>
            <li>Under <strong>Danger zone</strong>, tap <strong>Delete account</strong> and confirm.</li>
          </ol>

        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />
            <h2 className="font-heading text-2xl tracking-wide">What gets deleted</h2>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Your name, email, and phone number</li>
            <li>Contact preferences and preferred store</li>
            <li>Your active sign-in session</li>
          </ul>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-2xl tracking-wide">What we keep, and for how long</h2>
          </div>
          <p className="text-sm">
            Completed store orders remain without a link to your deleted account. This app does not store card numbers. Active orders must be completed or cancelled before deletion.
          </p>
        </section>


      </div>
    </div>
  );
}