import React from "react";

const STYLES = {
  "Pending Ticket": "bg-secondary text-foreground",
  Picking: "bg-[#dbe7f0] text-[#1f4a66]",
  "Approval Pending": "bg-[#f8e7c4] text-[#7a4f0e]",
  Ready: "bg-primary text-primary-foreground",
  Done: "bg-foreground text-background",
  Cancelled: "bg-[#f3d9d4] text-[#8f2a1d]",
};

export default function StatusChip({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${STYLES[status] || "bg-secondary"}`}>
      {status}
    </span>
  );
}