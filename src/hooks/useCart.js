import { useEffect, useState } from "react";

const KEY = "scr_carts";

// One cart per store, kept for the browser session (survives sign-in and card redirects).
export default function useCart(location) {
  const [carts, setCarts] = useState(() => JSON.parse(sessionStorage.getItem(KEY) || "{}"));

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(carts));
  }, [carts]);

  const items = carts[location] || [];
  const update = (fn) => setCarts((c) => ({ ...c, [location]: fn(c[location] || []) }));

  const add = (product) =>
    update((list) =>
      list.some((i) => i.sku === product.sku)
        ? list.map((i) => (i.sku === product.sku ? { ...i, qty: Math.min(i.qty + 1, product.available) } : i))
        : [...list, { sku: product.sku, name: product.name, size: product.size, price: product.price, qty: 1 }]
    );
  const setQty = (sku, qty) => update((list) => list.map((i) => (i.sku === sku ? { ...i, qty } : i)));
  const remove = (sku) => update((list) => list.filter((i) => i.sku !== sku));
  const clear = () => update(() => []);
  const setAll = (items) => update(() => items);
  const count = items.reduce((n, i) => n + i.qty, 0);

  return { items, add, setQty, remove, clear, setAll, count };
}