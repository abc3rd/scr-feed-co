import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CartLine from "@/components/cart/CartLine";
import FulfillmentPicker from "@/components/cart/FulfillmentPicker";
import { api } from "@/lib/api";
import { tomorrowISO } from "@/lib/format";

export default function CartDrawer({ open, onOpenChange, items, cart, location, onPlaced }) {
  const navigate = useNavigate();
  const [fulfillment, setFulfillment] = useState("pickup");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid =
    items.length > 0 &&
    items.every((i) => i.qty >= 1 && i.qty <= i.available) &&
    (fulfillment === "pickup" || (date && date >= tomorrowISO()));

  const placeHold = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.placeHold({
        location, fulfillment, deliveryDate: fulfillment === "delivery" ? date : null,
        lines: items.map((i) => ({ sku: i.sku, qty: i.qty })),
      });
      if (res.needsCard) navigate("/card");
      else onPlaced(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background px-4" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="max-w-xl mx-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-4xl tracking-wide font-normal">Your cart</SheetTitle>
            <SheetDescription>Holding at {location}</SheetDescription>
          </SheetHeader>
          {items.length ? (
            <ul className="mt-2">
              {items.map((i) => <CartLine key={i.sku} item={i} onQty={cart.setQty} onRemove={cart.remove} />)}
            </ul>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Your cart is empty.</p>
          )}
          <div className="mt-4">
            <FulfillmentPicker value={fulfillment} onChange={setFulfillment} date={date} onDate={setDate} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            We'll place a temporary hold on your card. You're only charged the verified amount at hand-off.
          </p>
          {error && <p role="alert" className="mt-3 text-destructive font-medium">{error}</p>}
          <button
            type="button"
            onClick={placeHold}
            disabled={!valid || busy}
            className="mt-4 w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            Place Hold
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}