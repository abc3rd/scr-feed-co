import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import StatusChip from "@/components/dashboard/StatusChip";
import { formatDate, formatMoney } from "@/lib/format";

export default function OrdersSection({ title, orders, emptyText = "", onReorder = undefined }) {
  return (
    <section aria-label={title}>
      <h2 className="font-heading text-3xl tracking-wide mb-3">{title}</h2>
      {orders.length ? (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center">
                <Link to={`/orders/${o.id}`} className="flex items-center gap-3 flex-1 min-w-0 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{o.id}</span>
                      <StatusChip status={o.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {o.location} · {o.fulfillment === "delivery" ? "Delivery" : "Pickup"} · {formatDate(o.date)}
                    </p>
                    {(Number.isFinite(o.finalAmount) || Number.isFinite(o.holdAmount)) && <p className="text-sm mt-1">
                      {o.finalAmount != null ? `Charged ${formatMoney(o.finalAmount)}` : `Hold ${formatMoney(o.holdAmount)}`}
                    </p>}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                </Link>
                {onReorder && (
                  <button
                    type="button"
                    onClick={() => onReorder(o)}
                    className="self-stretch mr-2 my-2 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center select-none active:opacity-80"
                  >
                    Reorder
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-2xl border border-dashed border-border p-4">{emptyText}</p>
      )}
    </section>
  );
}
