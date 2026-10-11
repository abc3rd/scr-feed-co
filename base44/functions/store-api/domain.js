export const STORES = ["LaBelle", "Fort Myers"];
export const FINAL_STATUSES = ["Done", "Cancelled"];
export const TRANSITIONS = {
  "Pending Ticket": ["Picking", "Cancelled"],
  Picking: ["Ready", "Cancelled"],
  Ready: ["Done", "Cancelled"],
  Done: [],
  Cancelled: [],
};

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function requireAdmin(user) {
  if (user.role !== "admin")
    throw new StoreError("Staff access is required.", 403);
}

export function text(value, label, max = 120, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    throw new StoreError(`Enter a valid ${label}.`);
  }
  return value.trim();
}

export function integer(value, label, min = 0, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new StoreError(`Enter a valid ${label}.`);
  return value;
}

export function store(value) {
  if (!STORES.includes(value)) throw new StoreError("Choose an SCR store.");
  return value;
}

export function localDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function orderInput(input, now = new Date()) {
  const location = store(input.location);
  const fulfillment = input.fulfillment;
  if (!["pickup", "delivery"].includes(fulfillment))
    throw new StoreError("Choose pickup or delivery.");
  const today = localDate(now);
  let date = today;
  let deliveryAddress = "";
  if (fulfillment === "delivery") {
    date = text(input.deliveryDate, "delivery date", 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
      date <= today ||
      date > localDate(new Date(now.getTime() + 90 * 86400000))
    ) {
      throw new StoreError(
        "Choose a delivery date from tomorrow through the next 90 days.",
      );
    }
    deliveryAddress = text(input.deliveryAddress, "delivery address", 500);
  }
  const notes = text(input.notes ?? "", "order notes", 500, false);
  const idempotencyKey = text(input.idempotencyKey, "request ID", 80);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey))
    throw new StoreError("Invalid request ID.");
  if (
    !Array.isArray(input.lines) ||
    !input.lines.length ||
    input.lines.length > 100
  )
    throw new StoreError("Your cart must contain between 1 and 100 products.");
  const seen = new Set();
  const lines = input.lines
    .map((line) => {
      if (!line || typeof line !== "object")
        throw new StoreError("Invalid order line.");
      const sku = text(line.sku, "SKU", 80);
      if (seen.has(sku))
        throw new StoreError("Combine duplicate products before ordering.");
      seen.add(sku);
      return {
        sku,
        qty: integer(line.qty, "quantity", 1, 10000),
        expectedPriceCents: integer(
          line.expectedPriceCents,
          "reviewed price",
          0,
          1000000,
        ),
      };
    })
    .sort((a, b) => a.sku.localeCompare(b.sku));
  return {
    location,
    fulfillment,
    date,
    deliveryAddress,
    notes,
    idempotencyKey,
    lines,
  };
}

export function validateTransition(order, nextStatus, user) {
  if (user.role !== "admin") {
    if (order.customer_id !== user.id)
      throw new StoreError("Order not found.", 404);
    if (nextStatus !== "Cancelled" || order.status !== "Pending Ticket")
      throw new StoreError(
        "Contact the store to change an order already being prepared.",
        409,
      );
  }
  if (!TRANSITIONS[order.status]?.includes(nextStatus))
    throw new StoreError("This order status cannot be changed that way.", 409);
}

export function orderView(order, lines) {
  return {
    id: order.id,
    status: order.status,
    location: order.location,
    fulfillment: order.fulfillment,
    date:
      typeof order.fulfillment_date === "string"
        ? order.fulfillment_date.slice(0, 10)
        : order.fulfillment_date.toISOString().slice(0, 10),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    subtotal: order.subtotal_cents / 100,
    finalAmount: order.final_cents == null ? null : order.final_cents / 100,
    paymentMethod: order.payment_method,
    deliveryAddress: order.delivery_address,
    notes: order.notes,
    lines: lines.map((l) => ({
      sku: l.sku,
      name: l.name,
      size: l.size,
      qty: l.qty,
      price: l.price_cents / 100,
    })),
  };
}
