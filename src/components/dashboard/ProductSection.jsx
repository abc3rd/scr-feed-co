import React from "react";
import ProductRow from "@/components/dashboard/ProductRow";

export default function ProductSection({ title, products, cartQty, onAdd, emptyText }) {
  return (
    <section aria-label={title}>
      <h2 className="font-heading text-3xl tracking-wide mb-3">{title}</h2>
      {products.length ? (
        <ul className="space-y-2">
          {products.map((p) => (
            <ProductRow key={p.sku} product={p} inCart={cartQty[p.sku] || 0} onAdd={onAdd} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-2xl border border-dashed border-border p-4">{emptyText}</p>
      )}
    </section>
  );
}