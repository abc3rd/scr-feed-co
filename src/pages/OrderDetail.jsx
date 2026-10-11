import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { setPendingReorder } from "@/lib/deepLink";
import StatusChip from "@/components/dashboard/StatusChip";
export default function OrderDetail() {
  const { id } = useParams(),
    location = useLocation(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const {
    data,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id),
    refetchInterval: 15000,
  });
  if (isLoading) return <p role="status">Loading order…</p>;
  if (loadError)
    return (
      <div role="alert">
        <p>{loadError.message}</p>
        <button onClick={() => refetch()} className="mt-4 underline">
          Try again
        </button>
      </div>
    );
  const order = data.order;
  const cancel = async () => {
    if (!window.confirm("Cancel this order and release its reserved stock?"))
      return;
    setBusy(true);
    setError("");
    try {
      await api.updateOrder({
        orderId: id,
        status: "Cancelled",
        expectedStatus: order.status,
      });
      await client.invalidateQueries();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {location.state?.placed && (
        <p
          role="status"
          className="rounded-xl bg-accent text-accent-foreground p-4"
        >
          Order received. No card was charged. Staff will prepare your order.
        </p>
      )}
      <h1 className="font-heading text-4xl">Your order</h1>
      <p className="text-sm break-all">{order.id}</p>
      <StatusChip status={order.status} />
      <p>
        {order.location} ·{" "}
        {order.fulfillment === "pickup" ? "Pickup" : "Delivery requested"} ·{" "}
        {formatDate(order.date)}
      </p>
      {order.deliveryAddress && (
        <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
      )}
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card p-4">
        {order.lines.map((l) => (
          <li key={l.sku} className="py-3 flex justify-between gap-3">
            <span>
              {l.qty} × {l.name}
              <span className="block text-sm text-muted-foreground">
                {l.size}
              </span>
            </span>
            <strong>{formatMoney(l.qty * l.price)}</strong>
          </li>
        ))}
      </ul>
      <p className="font-bold">
        {order.finalAmount != null
          ? "Recorded amount collected:"
          : "Estimated items:"}{" "}
        {formatMoney(order.finalAmount ?? order.subtotal)}
      </p>
      <p className="text-muted-foreground">
        {order.status === "Ready"
          ? "Your order is ready for hand-off."
          : "Pay the store at hand-off. Tax and any delivery fee are confirmed by staff."}
      </p>
      {order.notes && <p>Notes: {order.notes}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {order.status === "Pending Ticket" && (
        <button
          disabled={busy}
          onClick={cancel}
          className="h-12 px-5 rounded-xl border border-destructive text-destructive disabled:opacity-40"
        >
          Cancel order
        </button>
      )}
      {["Picking", "Ready"].includes(order.status) && (
        <p className="text-sm text-muted-foreground">
          Contact the store to change or cancel an order already being prepared.
        </p>
      )}
      {order.status === "Done" && (
        <Link
          to="/"
          onClick={() =>
            setPendingReorder({ location: order.location, lines: order.lines })
          }
          className="block text-center py-4 bg-primary text-primary-foreground rounded-xl font-bold"
        >
          Reorder these items
        </Link>
      )}
      <Link to="/orders" className="block underline py-3">
        All orders
      </Link>
    </div>
  );
}
