import React from "react";
import { STORES } from "@/lib/api";

export default function StoreSwitcher({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Store" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-secondary">
      {STORES.map((store) => {
        const active = value === store;
        return (
          <button
            key={store}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(store)}
            className={`h-12 rounded-xl font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-card/70"}`}
          >
            {store}
          </button>
        );
      })}
    </div>
  );
}