import React from "react";
import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function OptionSheet({ open, onOpenChange, title, options, value, onSelect }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl safe-area-bottom">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-2xl tracking-wide">{title}</SheetTitle>
        </SheetHeader>
        <div role="list" className="mt-2 space-y-1">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onSelect(o.value);
                  onOpenChange(false);
                }}
                className={`w-full flex items-center justify-between h-14 px-4 rounded-2xl text-left font-medium transition-colors select-none ${
                  active ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {active && <Check className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}