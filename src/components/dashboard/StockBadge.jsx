import React from "react";
import { stockStatus } from "@/lib/format";

const STYLES = {
  in: ["In stock", "bg-accent text-accent-foreground"],
  low: ["Low stock", "bg-[#f8e7c4] text-[#7a4f0e]"],
  out: ["Out of stock", "bg-[#f3d9d4] text-[#8f2a1d]"],
};

export default function StockBadge({ product }) {
  const [label, cls] = STYLES[stockStatus(product)];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}