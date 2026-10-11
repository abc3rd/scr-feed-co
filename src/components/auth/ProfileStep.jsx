import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/SessionContext";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";

const FIELDS = [
  ["firstName", "First name", "given-name", "text"],
  ["lastName", "Last name", "family-name", "text"],
  ["phone", "Phone for order questions", "tel", "tel"],
];

export default function ProfileStep() {
  const { customer, applyMe } = useSession();
  const [form, setForm] = useState({
    firstName: customer?.firstName || "", lastName: customer?.lastName || "",
    email: customer?.email || "", phone: customer?.phone || "", preferredStore: customer?.preferredStore || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = form.firstName.trim() && form.lastName.trim() && /^\S+@\S+\.\S+$/.test(form.email) && form.preferredStore;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      applyMe(await api.updateMe(form));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="pt-4 space-y-5">
      <div>
        <h1 className="font-heading text-5xl leading-none">Welcome in</h1>
        <p className="text-muted-foreground mt-2">A few details so the yard knows whose order is whose. Your sign-in email is used for your account.</p>
      </div>
      {FIELDS.map(([key, label, auto, type]) => (
        <div key={key}>
          <label htmlFor={key} className="block font-semibold mb-2">{label}</label>
          <input
            id={key}
            type={type}
            autoComplete={auto}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="w-full h-14 rounded-2xl border-2 border-input bg-card px-4 text-lg focus:border-primary"
          />
        </div>
      ))}
      <fieldset>
        <legend className="font-semibold mb-2">Preferred store</legend>
        <StoreSwitcher value={form.preferredStore} onChange={(s) => setForm({ ...form, preferredStore: s })} />
      </fieldset>
      {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
      <button
        type="submit"
        disabled={!valid || busy}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        Save &amp; start shopping
      </button>
    </form>
  );
}