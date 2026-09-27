import React from "react";
import { tomorrowISO } from "@/lib/format";

const OPTIONS = [["pickup", "Pickup"], ["delivery", "Delivery"]];

export default function FulfillmentPicker({ value, onChange, date, onDate }) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Pickup or delivery" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-secondary">
        {OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => onChange(key)}
            className={`h-12 rounded-xl font-semibold transition-all ${value === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {value === "delivery" && (
        <div>
          <label htmlFor="delivery-date" className="block font-semibold mb-2">Delivery date</label>
          <input
            id="delivery-date"
            type="date"
            min={tomorrowISO()}
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="w-full h-14 rounded-2xl border-2 border-input bg-card px-4 text-lg focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}