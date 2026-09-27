import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate, formatMoney } from "@/lib/format";

export default function HoldPlacedDialog({ order, onClose }) {
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-3xl bg-background">
        {order && (
          <div className="text-center">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto" aria-hidden="true" />
            <DialogTitle className="font-heading text-4xl tracking-wide font-normal mt-3">Hold placed</DialogTitle>
            <DialogDescription className="mt-1">
              Order {order.id} · {order.location} · {order.fulfillment === "delivery" ? "Delivery" : "Pickup"} {formatDate(order.date)}
            </DialogDescription>
            <div className="mt-5 rounded-2xl bg-card border border-border p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Temporary hold</p>
              <p className="font-heading text-5xl tracking-wide">{formatMoney(order.holdAmount)}</p>
              <p className="text-sm text-muted-foreground">You're only charged the verified amount at hand-off.</p>
            </div>
            <div className="mt-5 grid gap-2">
              <Link to={`/orders/${order.id}`} className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold grid place-items-center">
                View order
              </Link>
              <button type="button" onClick={onClose} className="h-12 rounded-2xl font-semibold">Keep shopping</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}