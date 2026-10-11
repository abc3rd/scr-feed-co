import React, { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function DeleteAccountDialog({ open, onOpenChange, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount();
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-destructive/10 grid place-items-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </span>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This deletes your personal store profile and sign-in account. Anonymous completed order records remain for store accounting. Cancel or complete active orders first. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-destructive font-medium text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground font-semibold px-4 hover:bg-destructive/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Delete account"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}