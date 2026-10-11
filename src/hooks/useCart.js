import { useState } from "react";
const KEY = "scr_carts";
function readCarts() {
  try {
    const data = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data)
        .filter(
          ([location, items]) =>
            ["LaBelle", "Fort Myers"].includes(location) &&
            Array.isArray(items),
        )
        .map(([location, items]) => [
          location,
          items.filter(
            (i) =>
              i &&
              typeof i.sku === "string" &&
              Number.isInteger(i.qty) &&
              i.qty > 0,
          ),
        ]),
    );
  } catch {
    return {};
  }
}
export default function useCart(location) {
  const [carts, setCarts] = useState(readCarts);
  const items = carts[location] || [];
  const update = (fn) =>
    setCarts((previous) => {
      const next = { ...previous, [location]: fn(previous[location] || []) };
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  const add = (product) => {
    if (product.available < 1) return;
    update((list) =>
      list.some((i) => i.sku === product.sku)
        ? list.map((i) =>
            i.sku === product.sku
              ? { ...i, qty: Math.min(i.qty + 1, product.available) }
              : i,
          )
        : [
            ...list,
            {
              sku: product.sku,
              name: product.name,
              size: product.size,
              price: product.price,
              qty: 1,
            },
          ],
    );
  };
  const setQty = (sku, qty) => {
    if (Number.isInteger(qty) && qty > 0)
      update((list) => list.map((i) => (i.sku === sku ? { ...i, qty } : i)));
  };
  const remove = (sku) => update((list) => list.filter((i) => i.sku !== sku));
  const clear = () => {
    const next = { ...readCarts(), [location]: [] };
    sessionStorage.setItem(KEY, JSON.stringify(next));
    setCarts(next);
  };
  const setAll = (lines) =>
    update(() => lines.filter((i) => Number.isInteger(i.qty) && i.qty > 0));
  return {
    items,
    add,
    setQty,
    remove,
    clear,
    setAll,
    count: items.reduce((sum, i) => sum + i.qty, 0),
  };
}
