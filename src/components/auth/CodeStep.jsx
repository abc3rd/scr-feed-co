import React, { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { useSession } from "@/lib/SessionContext";

export default function CodeStep({ phone, onBack }) {
  const { applyMe } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      applyMe(await api.verifyCode(phone, code));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await api.sendCode(phone);
      setNotice("New code sent.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-muted-foreground">We texted a 6-digit code to <strong className="text-foreground">{formatPhone(phone)}</strong>.</p>
      <div>
        <label htmlFor="code" className="block font-semibold mb-2">6-digit code</label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full h-16 rounded-2xl border-2 border-input bg-card px-4 text-3xl text-center tracking-[0.5em] font-semibold focus:border-primary"
        />
      </div>
      {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
      {notice && !error && <p role="status" className="text-primary font-medium">{notice}</p>}
      <button
        type="submit"
        disabled={code.length !== 6 || busy}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        Verify &amp; continue
      </button>
      <div className="flex justify-between gap-2">
        <button type="button" onClick={onBack} className="h-12 px-2 rounded-xl flex items-center gap-1 font-semibold">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Change number
        </button>
        <button type="button" onClick={resend} className="h-12 px-2 rounded-xl font-semibold text-primary">
          Resend code
        </button>
      </div>
    </form>
  );
}