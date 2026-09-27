import { format, parseISO, addDays } from "date-fns";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = (n) => (n === null || n === undefined ? "—" : money.format(n));
export const formatDate = (iso) => (iso ? format(parseISO(iso), "EEE, MMM d") : "—");
export const tomorrowISO = () => format(addDays(new Date(), 1), "yyyy-MM-dd");

export function formatPhone(digits) {
  const d = digits.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function stockStatus(product) {
  if (!product || product.available <= 0) return "out";
  if (product.available <= product.reorderThreshold) return "low";
  return "in";
}

export function indexProducts(data) {
  const all = [...(data?.orderAgain || []), ...(data?.favorites || []), ...(data?.categories || []).flatMap((c) => c.products)];
  return Object.fromEntries(all.map((p) => [p.sku, p]));
}