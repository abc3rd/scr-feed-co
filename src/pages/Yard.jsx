import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, STORES } from "@/lib/api";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import StatusChip from "@/components/dashboard/StatusChip";
import { formatDate, formatMoney } from "@/lib/format";

function PickTicket({ order }) {
  const client = useQueryClient();
  const [checked, setChecked] = useState({}),
    [collected, setCollected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const allPicked = order.lines.every((l) => checked[l.sku]);
  const update = async (status) => {
    if (
      status === "Cancelled" &&
      !window.confirm("Cancel this order and release the reserved stock?")
    )
      return;
    if (
      status === "Done" &&
      !window.confirm(
        "Confirm the items were handed off and payment was collected at the store?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const finalCents =
        status === "Done" ? Math.round(Number(collected) * 100) : undefined;
      await api.updateOrder({
        orderId: order.id,
        status,
        expectedStatus: order.status,
        finalCents,
      });
      await client.invalidateQueries();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const next = { "Pending Ticket": "Picking", Picking: "Ready", Ready: "Done" }[
    order.status
  ];
  const finalValid =
    /^\d+(\.\d{1,2})?$/.test(collected) && Number(collected) <= 1000000;
  return (
    <article className="space-y-3 bg-card border border-border rounded-2xl p-4 print:break-inside-avoid">
      <div className="flex flex-wrap gap-2 items-center">
        <StatusChip status={order.status} />
        <strong>{order.customerName}</strong>
      </div>
      <Link to={`/orders/${order.id}`} className="text-sm underline break-all">
        {order.id}
      </Link>
      <p>
        {order.fulfillment === "pickup" ? "Pickup" : "Delivery requested"} ·{" "}
        {formatDate(order.date)}
      </p>
      {order.deliveryAddress && (
        <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
      )}
      {order.phone && (
        <a
          href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
          className="block underline"
        >
          {order.phone}
        </a>
      )}
      {order.email && (
        <a href={`mailto:${order.email}`} className="block underline break-all">
          {order.email}
        </a>
      )}
      <ul className="divide-y divide-border">
        {order.lines.map((l) => (
          <li key={l.sku} className="py-2">
            <label className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={!!checked[l.sku]}
                onChange={(e) =>
                  setChecked({ ...checked, [l.sku]: e.target.checked })
                }
                className="mt-1 h-5 w-5 print:hidden"
              />
              <span>
                <strong>
                  {l.qty} × {l.name}
                </strong>
                <span className="block text-sm text-muted-foreground">
                  {l.sku} · {l.size}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="whitespace-pre-wrap">Notes: {order.notes}</p>
      )}
      <p className="font-bold">Items estimate: {formatMoney(order.subtotal)}</p>
      {order.status === "Ready" && (
        <label className="block print:hidden font-semibold">
          Amount collected at hand-off
          <input
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={collected}
            onChange={(e) => setCollected(e.target.value)}
            className="block w-full mt-2 h-12 px-3 rounded-xl border border-input bg-background"
          />
          <span className="block text-sm font-normal text-muted-foreground">
            Enter the total from your register, including tax and delivery fees.
            This records payment; it does not charge a card.
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => update(next)}
          disabled={
            busy ||
            (order.status !== "Pending Ticket" && !allPicked) ||
            (next === "Done" && !finalValid)
          }
          className="h-12 px-4 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
        >
          {busy
            ? "Saving…"
            : next === "Picking"
              ? "Start picking"
              : next === "Ready"
                ? "Mark ready"
                : "Complete hand-off"}
        </button>
        <button
          onClick={() => update("Cancelled")}
          disabled={busy}
          className="h-12 px-4 rounded-xl border border-destructive text-destructive"
        >
          Cancel
        </button>
      </div>
      {order.status !== "Pending Ticket" && !allPicked && (
        <p className="text-sm text-muted-foreground print:hidden">
          Check every line after verifying the physical quantities.
        </p>
      )}
    </article>
  );
}

export default function Yard() {
  const [location, setLocation] = useState(STORES[0]);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["yard", location],
    queryFn: () => api.getStaffOrders(location),
    refetchInterval: 15000,
  });
  return (
    <div className="space-y-5">
      <h1 className="font-heading text-4xl">Yard pick tickets</h1>
      <div className="print:hidden">
        <StoreSwitcher value={location} onChange={setLocation} />
        <div className="flex flex-wrap gap-4 mt-4">
          <Link to="/inventory" className="underline">
            Manage products & stock
          </Link>
          <Link to="/seo" className="underline">
            Site performance
          </Link>
          <Link to="/qr" className="underline">
            Counter QR
          </Link>
        </div>
      </div>
      <div className="flex gap-4 print:hidden">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="underline"
        >
          Refresh tickets
        </button>
        <button onClick={() => window.print()} className="underline">
          Print tickets
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Orders reserve stock when submitted. Inventory is deducted once, when
        hand-off is completed.
      </p>
      {isLoading ? (
        <p role="status">Loading pick tickets…</p>
      ) : error ? (
        <div role="alert" className="space-y-4">
          <p>{error.message}</p>
          <Link to="/inventory" className="inline-block underline">
            Open store setup
          </Link>
        </div>
      ) : data.orders.length ? (
        data.orders.map((o) => <PickTicket key={o.id + o.status} order={o} />)
      ) : (
        <p className="rounded-2xl bg-card border border-border p-5">
          No active orders at {location}.
        </p>
      )}
    </div>
  );
}
