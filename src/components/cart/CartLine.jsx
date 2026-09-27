import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";

export default function CartLine({ item, onQty, onRemove }) {
  const over = item.qty > item.available;
  return (
    <li className="py-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.size} · {formatMoney(item.price)} ea</p>
          {over && (
            <p className="text-sm font-semibold text-destructive mt-1">
              {item.available > 0 ? `Only ${item.available} available` : "Out of stock at this store"}
            </p>
          )}
        </div>
        <button type="button" onClick={() => onRemove(item.sku)} aria-label={`Remove ${item.name}`} className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-muted-foreground hover:text-destructive">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 inline-flex items-center rounded-xl border border-border bg-card">
        <button type="button" onClick={() => onQty(item.sku, item.qty - 1)} disabled={item.qty <= 1} aria-label={`Decrease ${item.name}`} className="h-11 w-11 grid place-items-center disabled:opacity-30">
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-10 text-center font-bold" aria-live="polite">{item.qty}</span>
        <button type="button" onClick={() => onQty(item.sku, item.qty + 1)} disabled={item.qty >= item.available} aria-label={`Increase ${item.name}`} className="h-11 w-11 grid place-items-center disabled:opacity-30">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}