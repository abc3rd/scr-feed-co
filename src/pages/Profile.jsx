import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, STORES } from "@/lib/api";
import { useSession } from "@/lib/SessionContext";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import DeleteAccountDialog from "@/components/profile/DeleteAccountDialog";

const FIELDS = [
  ["firstName", "First name", "given-name", "text"],
  ["lastName", "Last name", "family-name", "text"],
  ["email", "Email", "email", "email"],
];

export default function Profile() {
  const { customer, applyMe, signOut } = useSession();
  const [form, setForm] = useState({
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
    email: customer?.email || "",
    preferredStore: customer?.preferredStore || STORES[0],
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^\S+@\S+\.\S+$/.test(form.email) &&
    form.preferredStore;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      applyMe(await api.updateMe(form));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-4 space-y-8">
      <div>
        <h1 className="font-heading text-5xl leading-none">Profile</h1>
        <p className="text-muted-foreground mt-2">Update your details and preferred store.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {FIELDS.map(([key, label, auto, type]) => (
          <div key={key}>
            <label htmlFor={key} className="block font-semibold mb-2">
              {label}
            </label>
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
          <StoreSwitcher
            value={form.preferredStore}
            onChange={(s) => setForm({ ...form, preferredStore: s })}
          />
        </fieldset>
        {error && <p role="alert" className="text-destructive font-medium">{error}</p>}
        {saved && <p className="text-primary font-medium">Saved.</p>}
        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          Save changes
        </button>
      </form>

      <section aria-label="Danger zone" className="rounded-2xl border-2 border-destructive/30 bg-card p-5">
        <h2 className="font-heading text-3xl tracking-wide text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deleting your account removes your profile, saved details, and order history. This can't be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="mt-4 h-12 px-5 rounded-2xl border-2 border-destructive text-destructive font-bold hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          Delete account
        </button>
      </section>

      <DeleteAccountDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onDeleted={() => signOut()}
      />
    </div>
  );
}