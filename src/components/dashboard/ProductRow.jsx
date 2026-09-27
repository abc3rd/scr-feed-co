import React from "react";
import { Plus, Wheat } from "lucide-react";
import StockBadge from "@/components/dashboard/StockBadge";
import { formatMoney, stockStatus } from "@/lib/format";

export default function ProductRow({ product, inCart = 0, onAdd }) {
  const out = stockStatus(product) === "out";
  const maxed = inCart >= product.available;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-accent grid place-items-center" aria-hidden="true">
        <Wheat className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight line-clamp-2">{product.name}</p>
        <p className="text-sm text-muted-foreground">{product.size}{inCart > 0 && ` · ${inCart} in cart`}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="font-bold">{formatMoney(product.price)}</span>
          <StockBadge product={product} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={out || maxed}
        aria-label={out ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
        className="h-12 px-4 shrink-0 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-1 active:scale-95 transition-transform disabled:bg-muted disabled:text-muted-foreground disabled:active:scale-100"
      >
        {out ? "Out" : <><Plus className="h-4 w-4" aria-hidden="true" />Add</>}
      </button>
    </li>
  );
}