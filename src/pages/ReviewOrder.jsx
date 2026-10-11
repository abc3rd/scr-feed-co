import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { readCheckout, clearCheckout } from "@/lib/checkout";
import { indexProducts, formatMoney } from "@/lib/format";
import useCart from "@/hooks/useCart";
export default function ReviewOrder() {
  const [checkout] = useState(readCheckout);
  const cart = useCart(checkout?.location || "LaBelle");
  const navigate = useNavigate(),
    queryClient = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const {
    data: previous,
    isLoading: checkingPrevious,
    error: previousError,
  } = useQuery({
    queryKey: ["order-request", checkout?.idempotencyKey],
    queryFn: () => api.findOrder(checkout.idempotencyKey),
    enabled: !!checkout,
    staleTime: 0,
  });
  useEffect(() => {
    if (previous?.order) {
      cart.clear();
      clearCheckout();
      navigate(`/orders/${previous.order.id}`, { replace: true });
    }
  }, [previous?.order?.id]);
  const {
    data,
    isLoading,
    error: loadError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard", checkout?.location],
    queryFn: () => api.getDashboard(checkout.location),
    enabled: !!checkout,
    staleTime: 0,
  });
  if (!checkout)
    return (
      <div>
        <h1 className="font-heading text-4xl">Your cart is empty</h1>
        <Link to="/" className="inline-block mt-4 underline">
          Browse products
        </Link>
      </div>
    );
  const index = indexProducts(data),
    lines = checkout.lines.map((l) => ({
      ...index[l.sku],
      sku: l.sku,
      qty: l.qty,
      expectedPriceCents: l.expectedPriceCents,
    }));
  const valid =
    !isLoading &&
    !loadError &&
    !checkingPrevious &&
    !previousError &&
    lines.every(
      (l) =>
        l.name &&
        l.qty <= l.available &&
        Math.round(l.price * 100) === l.expectedPriceCents,
    );
  const submit = async () => {
    if (busy || !confirmed || !valid) return;
    setBusy(true);
    setError("");
    try {
      const { order } = await api.placeOrder(checkout);
      cart.clear();
      clearCheckout();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${order.id}`, {
        replace: true,
        state: { placed: true },
      });
    } catch (err) {
      // An interrupted response can follow a committed order. Recover it instead
      // of requiring stock that this same order has already reserved.
      try {
        const recovered = await api.findOrder(checkout.idempotencyKey);
        if (recovered.order) {
          cart.clear();
          clearCheckout();
          navigate(`/orders/${recovered.order.id}`, { replace: true });
          return;
        }
      } catch {
        /* Display original failure and retain request ID. */
      }
      setError(err.message);
      await refetch();
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="font-heading text-4xl">Review your order</h1>
      {checkingPrevious && (
        <p role="status">Checking for an already submitted order…</p>
      )}
      {previousError && (
        <p role="alert" className="text-destructive">
          {previousError.message}
        </p>
      )}
      <p>
        {checkout.location} ·{" "}
        {checkout.fulfillment === "pickup"
          ? "Pickup"
          : `Delivery requested: ${checkout.deliveryDate}`}
      </p>
      {checkout.deliveryAddress && (
        <p className="whitespace-pre-wrap">{checkout.deliveryAddress}</p>
      )}
      {isLoading ? (
        <p role="status">Checking current stock…</p>
      ) : loadError ? (
        <p role="alert">{loadError.message}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl bg-card border border-border p-4">
          {lines.map((l) => (
            <li key={l.sku} className="py-3">
              <span className="font-semibold">
                {l.qty} × {l.name || l.sku}
              </span>
              <span className="block text-sm text-muted-foreground">
                {l.size} · {formatMoney(l.price)} each
              </span>
              {(!l.name ||
                l.qty > l.available ||
                Math.round(l.price * 100) !== l.expectedPriceCents) && (
                <span role="alert" className="text-destructive">
                  Stock or price changed. Return to your cart to review this
                  item.
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {valid && (
        <p className="text-xl font-bold">
          Estimated items:{" "}
          {formatMoney(lines.reduce((sum, l) => sum + l.price * l.qty, 0))}
        </p>
      )}
      <p className="text-muted-foreground">
        Pay at hand-off. Staff confirm tax, any delivery fee, and availability.
        Wait for your order to show Ready before coming to collect it.
      </p>
      {checkout.notes && <p>Notes: {checkout.notes}</p>}
      <label className="flex gap-3 p-4 bg-card border border-border rounded-xl">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-5 w-5"
        />
        I have checked the store, quantities, and fulfillment details.
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <button
        disabled={!valid || !confirmed || busy || isFetching}
        onClick={submit}
        className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-40"
      >
        {busy ? "Submitting…" : "Submit order"}
      </button>
      <Link to="/" className="inline-block py-3 underline">
        Edit cart
      </Link>
      <button
        onClick={() => refetch()}
        disabled={busy || isFetching}
        className="ml-5 underline"
      >
        Refresh stock
      </button>
    </div>
  );
}
