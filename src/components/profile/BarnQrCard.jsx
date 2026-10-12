import React, { useEffect, useState } from "react";
import { Loader2, Printer, Copy } from "lucide-react";
import { api } from "@/lib/api";
import QrCode from "@/components/qr/QrCode";
import { memberUrl } from "@/lib/qr";

export default function BarnQrCard() {
  const [token, setToken] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getMyQr()
      .then((d) => { if (active) setToken(d.token); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  const url = token ? memberUrl(token) : "";

  const copy = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section aria-label="Your barn QR" className="rounded-2xl border-2 border-border bg-card p-5">
      <h2 className="font-heading text-3xl tracking-wide">Your barn QR</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Print this and hang it in the barn. Sign in to your account after scanning to view your last order and start a reorder.
      </p>
      {error ? (
        <p role="alert" className="text-destructive font-medium mt-3">{error}</p>
      ) : !token ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            <QrCode value={url} size={240} alt="Your barn QR code" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground break-all text-center">{url}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold inline-flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              onClick={copy}
              className="flex-1 h-12 rounded-2xl border-2 border-input bg-card font-bold inline-flex items-center justify-center gap-2"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
