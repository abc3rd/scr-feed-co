const KEY = "scr_checkout";
export function readCheckout() {
  try {
    const checkout = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!checkout) return null;
    if (
      !["LaBelle", "Fort Myers"].includes(checkout.location) ||
      !["pickup", "delivery"].includes(checkout.fulfillment) ||
      typeof checkout.idempotencyKey !== "string" ||
      !checkout.idempotencyKey ||
      typeof checkout.signature !== "string" ||
      !Array.isArray(checkout.lines) ||
      !checkout.lines.length ||
      !checkout.lines.every(
        (line) =>
          line &&
          typeof line.sku === "string" &&
          Number.isInteger(line.qty) &&
          line.qty > 0 &&
          Number.isInteger(line.expectedPriceCents) &&
          line.expectedPriceCents >= 0,
      )
    ) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return checkout;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
export function saveCheckout(input) {
  const previous = readCheckout();
  const signature = JSON.stringify(input);
  const idempotencyKey =
    previous?.signature === signature
      ? previous.idempotencyKey
      : crypto.randomUUID();
  const checkout = { ...input, signature, idempotencyKey };
  sessionStorage.setItem(KEY, JSON.stringify(checkout));
  return checkout;
}
export function clearCheckout() {
  sessionStorage.removeItem(KEY);
}
