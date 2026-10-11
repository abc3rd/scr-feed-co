import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function ContactPreferences() {
  const [values, setValues] = useState({
      smsConsent: false,
      emailConsent: false,
    }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .getConsent()
      .then((data) => {
        if (active) setValues(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.optIn({ ...values, source: "profile" });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl bg-card border border-border p-5"
    >
      <h2 className="font-heading text-3xl">Contact preferences</h2>
      <p className="text-sm text-muted-foreground">
        Optional preferences for SCR messages. Consent is not required to order.
        This saves your choices; order status is available in the app.
      </p>
      <label className="flex gap-3">
        <input
          disabled={busy}
          type="checkbox"
          checked={values.smsConsent}
          onChange={(e) =>
            setValues({ ...values, smsConsent: e.target.checked })
          }
          className="mt-1 h-5 w-5"
        />
        <span>
          Allow SCR Feed Co. texts about orders, reorder reminders, and offers.
          Frequency varies. Message and data rates may apply. Reply STOP to opt
          out.
        </span>
      </label>
      <label className="flex gap-3">
        <input
          disabled={busy}
          type="checkbox"
          checked={values.emailConsent}
          onChange={(e) =>
            setValues({ ...values, emailConsent: e.target.checked })
          }
          className="mt-1 h-5 w-5"
        />
        <span>
          Allow SCR Feed Co. emails about orders, reorder reminders, and store
          news.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {saved && <p role="status">Preferences saved.</p>}
      <button
        disabled={busy}
        className="h-12 px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
      >
        Save preferences
      </button>
    </form>
  );
}
