import React from "react";
import { Printer } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";
import QrCode from "@/components/qr/QrCode";
import { joinUrl } from "@/lib/qr";

export default function QrCodes() {
  const url = joinUrl("register");
  return (
    <div className="min-h-screen bg-background">
      <BackHeader title="QR codes" to="/" />
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-2xl bg-card border border-border p-6 text-center">
          <h1 className="font-heading text-3xl tracking-wide">Register &amp; sign-up QR</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Print this and set it at the counter. Customers scan it to create an account, choose their store, and start ordering.
          </p>
          <div className="mt-5 flex justify-center">
            <QrCode value={url} size={240} alt="Register sign-up QR code" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground break-all">{url}</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-5 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}