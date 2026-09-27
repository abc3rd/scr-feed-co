import React, { useState } from "react";
import ProductRow from "@/components/dashboard/ProductRow";

export default function CategoryBrowser({ categories, cartQty, onAdd }) {
  const [active, setActive] = useState(categories[0]?.name);
  const current = categories.find((c) => c.name === active) || categories[0];

  return (
    <section aria-label="Browse by category">
      <h2 className="font-heading text-3xl tracking-wide mb-3">Browse by category</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={current?.name === c.name}
            onClick={() => setActive(c.name)}
            className={`h-11 px-4 rounded-full font-semibold border transition-colors ${current?.name === c.name ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:border-foreground/40"}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {current?.products.map((p) => (
          <ProductRow key={p.sku} product={p} inCart={cartQty[p.sku] || 0} onAdd={onAdd} />
        ))}
      </ul>
    </section>
  );
}