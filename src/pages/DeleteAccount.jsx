import React from "react";
import { Phone, Mail, Trash2, ShieldCheck } from "lucide-react";
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
          <p className="text-sm text-muted-foreground">Prefer to do it by phone or email? See below.</p>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />
            <h2 className="font-heading text-2xl tracking-wide">What gets deleted</h2>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Your name, email, and phone number</li>
            <li>Saved card details and preferred store</li>
            <li>Your active sign-in session</li>
          </ul>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-2xl tracking-wide">What we keep, and for how long</h2>
          </div>
          <p className="text-sm">
            Order records and payment/transaction records are retained for <strong>7 years</strong> after your last
            order, as required for tax, accounting, and dispute resolution. They are then permanently deleted. This
            retained data is not linked to your deleted profile.
          </p>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h2 className="font-heading text-2xl tracking-wide">Request by phone or email</h2>
          <div className="space-y-2 text-sm">
            <a
              href="tel:+18635550140"
              className="flex items-center gap-3 py-2 rounded-lg hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
              (863) 555-0140
            </a>
            <a
              href="mailto:support@scrfeedco.com"
              className="flex items-center gap-3 py-2 rounded-lg hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              support@scrfeedco.com
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Include your account phone number. We'll confirm your identity before processing.
          </p>
        </section>
      </div>
    </div>
  );
}