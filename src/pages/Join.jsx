import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { Loader2, Sprout } from "lucide-react";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import AssistantChat from "@/components/assistant/AssistantChat";

export default function Join() {
  const src = new URLSearchParams(window.location.search).get("src");
  const [step, setStep] = useState("optin");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = (smsConsent || emailConsent) && (!smsConsent || phone.length === 10) && (!emailConsent || /^\S+@\S+\.\S+$/.test(email.trim()));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.optIn({ phone, email: email.trim(), smsConsent, emailConsent, source: src || "qr" });
      setStep("chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-2">
          <Sprout className="h-6 w-6" aria-hidden="true" />
          <span className="font-heading text-3xl tracking-wider leading-none">SCR Feed Co.</span>
        </div>
      </header>
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-6 safe-area-bottom">
        {step === "optin" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Feed · Hay · Bedding</p>
            <h1 className="font-heading text-5xl leading-none mt-2">Welcome aboard.</h1>
            <p className="text-muted-foreground mt-3">
              Sign up in one step — add your number, then chat with our assistant right here about feed, orders, and
              reorders.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="join-phone" className="block font-semibold mb-2">Mobile number</label>
                <input
                  id="join-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="Your mobile number"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full h-14 rounded-2xl border-2 border-input bg-card px-4 text-xl tracking-wide focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="join-email" className="block font-semibold mb-2">
                  Email <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id="join-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 rounded-2xl border-2 border-input bg-card px-4 text-lg focus:border-primary"
                />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-primary"
                />
                <span className="text-sm leading-relaxed">
                  Text me order updates, reorder reminders, and offers from SCR Feed Co. Consent isn't a condition of
                  purchase. Msg frequency varies; msg &amp; data rates may apply. Reply STOP to opt out.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <input
                  type="checkbox"
                  checked={emailConsent}
                  onChange={(e) => setEmailConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-primary"
                />
                <span className="text-sm leading-relaxed">Email me occasional store news and reorder reminders.</span>
              </label>
              {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
      {error && <Link to="/login?returnTo=%2Fjoin" className="block text-primary underline">Sign in to save your preferences</Link>}
              <button
                type="submit"
                disabled={!valid || busy}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                Sign up &amp; start chatting
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-heading text-5xl leading-none">You're in.</h1>
            <p className="text-muted-foreground mt-2">
              Ask the SCR assistant anything about feed, orders, or your animals.
            </p>
            <AssistantChat
              className="mt-5 h-[58vh]"
              greeting="Hi! I'm the SCR Feed Co. assistant. Ask me about feed and supplies, orders, or reorders."
            />
          </>
        )}
      </div>
    </div>
  );
}
