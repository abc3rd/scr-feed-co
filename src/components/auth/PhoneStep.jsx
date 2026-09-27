import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";

export default function PhoneStep({ phone, setPhone, onSent }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = phone.length === 10;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.sendCode(phone);
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block font-semibold mb-2">Mobile number</label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(239) 555-0142"
          value={formatPhone(phone)}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          aria-describedby="sms-consent"
          className="w-full h-14 rounded-2xl border-2 border-input bg-card px-4 text-xl tracking-wide focus:border-primary"
        />
      </div>
      <p id="sms-consent" className="text-sm leading-relaxed text-muted-foreground">
        By tapping 'Text me a code' you agree to receive automated order &amp; account texts from SCR Feed Co. at this number. Consent is not a condition of purchase. Msg frequency varies. Msg &amp; data rates may apply. Reply HELP for help, STOP to opt out.{" "}
        <a href="https://scr-feed-app.vercel.app/terms.html#sms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground rounded">SMS Terms</a>
        {" · "}
        <a href="https://scr-feed-app.vercel.app/privacy.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground rounded">Privacy Policy</a>
      </p>
      {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
      <button
        type="submit"
        disabled={!valid || busy}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        Text me a code
      </button>
    </form>
  );
}