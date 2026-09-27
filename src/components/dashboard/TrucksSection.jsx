import React from "react";
import { Truck } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function TrucksSection({ trucks, location }) {
  return (
    <section aria-label="Truck ETA">
      <h2 className="font-heading text-3xl tracking-wide mb-3">Truck ETA</h2>
      {trucks.length ? (
        <ul className="space-y-2">
          {trucks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-foreground text-background p-4">
              <Truck className="h-6 w-6 shrink-0 opacity-80" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.supplier}</p>
                <p className="text-sm opacity-75">{t.note}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest opacity-60">ETA</p>
                <p className="font-heading text-xl tracking-wide">{formatDate(t.eta)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-2xl border border-dashed border-border p-4">No trucks scheduled for {location} right now.</p>
      )}
    </section>
  );
}