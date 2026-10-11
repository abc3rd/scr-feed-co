import React from "react";

const STYLES = {
  "Pending Ticket": "bg-secondary text-foreground",
  Picking: "bg-accent text-accent-foreground",
  "Approval Pending": "bg-secondary text-foreground",
  Ready: "bg-primary text-primary-foreground",
  Done: "bg-foreground text-background",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function StatusChip({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${STYLES[status] || "bg-secondary"}`}>
      {status}
    </span>
  );
}