import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import CartLine from "@/components/cart/CartLine";
import FulfillmentPicker from "@/components/cart/FulfillmentPicker";
import { tomorrowISO, formatMoney } from "@/lib/format";
import { saveCheckout } from "@/lib/checkout";
export default function CartDrawer({
  open,
  onOpenChange,
  items,
  cart,
  location,
}) {
  const navigate = useNavigate();
  const [fulfillment, setFulfillment] = useState("pickup");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const valid =
    items.length > 0 &&
    items.every(
      (i) => Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= i.available,
    ) &&
    (fulfillment === "pickup" || (date >= tomorrowISO() && address.trim()));
  const review = () => {
    saveCheckout({
      location,
      fulfillment,
      deliveryDate: fulfillment === "delivery" ? date : null,
      deliveryAddress: fulfillment === "delivery" ? address.trim() : "",
      notes: notes.trim(),
      lines: items.map((i) => ({
        sku: i.sku,
        qty: i.qty,
        expectedPriceCents: Math.round(i.price * 100),
      })),
    });
    onOpenChange(false);
    navigate("/review");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background px-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-xl mx-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-4xl font-normal">
              Your cart
            </SheetTitle>
            <SheetDescription>Ordering at {location}</SheetDescription>
          </SheetHeader>
          {items.length ? (
            <ul className="mt-2">
              {items.map((i) => (
                <CartLine
                  key={i.sku}
                  item={i}
                  onQty={cart.setQty}
                  onRemove={cart.remove}
                />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-muted-foreground">Your cart is empty.</p>
          )}
          <div className="mt-4">
            <FulfillmentPicker
              value={fulfillment}
              onChange={setFulfillment}
              date={date}
              onDate={setDate}
            />
          </div>
          {fulfillment === "delivery" && (
            <label className="block mt-4 font-semibold">
              Delivery address
              <textarea
                required
                maxLength={500}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                className="mt-2 w-full p-3 rounded-xl bg-card border border-input"
              />
              <span className="block text-sm font-normal text-muted-foreground">
                The store must confirm your delivery area, fee, and schedule.
              </span>
            </label>
          )}
          <label className="block mt-4 font-semibold">
            Order notes (optional)
            <textarea
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full p-3 rounded-xl bg-card border border-input"
            />
          </label>
          <p className="mt-4 font-bold">
            Estimated items:{" "}
            {formatMoney(items.reduce((sum, i) => sum + i.price * i.qty, 0))}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pay the store at hand-off. Tax and any delivery fee are confirmed by
            staff. No online card charge or hold is made.
          </p>
          <button
            type="button"
            onClick={review}
            disabled={!valid}
            className="mt-4 w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold disabled:opacity-40"
          >
            Review order
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
