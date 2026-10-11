import { scanning, SCAN_ACTIONS } from "./scanning.js";
import { SCHEMA } from "./schema.js";
import {
  StoreError,
  requireAdmin,
  store,
  text,
  integer,
  orderInput,
  validateTransition,
  orderView,
  FINAL_STATUSES,
} from "./domain.js";

const profileView = (row) => ({
  id: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  preferredStore: row.preferred_store,
  card: null,
});
const profileResult = (row) => ({
  customer: profileView(row),
  needsName: !row.first_name || !row.last_name,
});
const productView = (row) => ({
  sku: row.sku,
  name: row.name,
  size: row.size,
  category: row.category,
  price: row.price_cents / 100,
  active: row.active,
  available: (row.on_hand ?? 0) - (row.reserved ?? 0),
  onHand: row.on_hand ?? 0,
  reserved: row.reserved ?? 0,
  reorderThreshold: row.reorder_threshold ?? 0,
  version: row.version ?? null,
  catalogVersion: row.catalog_version,
  isFavorite: !!row.is_favorite,
});

async function customer(sql, user) {
  return sql.begin(async (tx) => {
    // The same lock guards deletion, including a first-time profile creation.
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"account:" + user.id},0))`;
    const [deleted] =
      await tx`SELECT user_id FROM scr_deleted_users WHERE user_id=${user.id}`;
    if (deleted)
      throw new StoreError("Your account deletion is being processed.", 409);
    const [row] =
      await tx`INSERT INTO scr_customers (user_id,email,qr_token) VALUES (${user.id},${user.email},${crypto.randomUUID()}) ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email RETURNING *`;
    return row;
  });
}

async function getOrders(sql, userId, location) {
  const orders = location
    ? await sql`SELECT * FROM scr_orders WHERE customer_id=${userId} AND location=${location} ORDER BY created_at DESC LIMIT 500`
    : await sql`SELECT * FROM scr_orders WHERE customer_id=${userId} ORDER BY created_at DESC LIMIT 500`;
  if (!orders.length) return [];
  const lines =
    await sql`SELECT * FROM scr_order_lines WHERE order_id IN ${sql(orders.map((o) => o.id))} ORDER BY sku`;
  return orders.map((o) =>
    orderView(
      o,
      lines.filter((l) => l.order_id === o.id),
    ),
  );
}

async function placeOrder(sql, user, body) {
  const input = orderInput(body);
  return sql.begin(async (tx) => {
    // Serializes double taps/retries even across function instances. Transactions
    // also serialize deletion against order creation using the customer row lock.
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${user.id + ":" + input.idempotencyKey},0))`;
    const [profile] =
      await tx`SELECT * FROM scr_customers WHERE user_id=${user.id} FOR UPDATE`;
    if (!profile || !profile.first_name || !profile.last_name)
      throw new StoreError("Complete your profile before ordering.", 409);
    const [existing] =
      await tx`SELECT * FROM scr_orders WHERE customer_id=${user.id} AND idempotency_key=${input.idempotencyKey}`;
    if (existing) {
      // The server assigns today's pickup date, so retries across midnight compare
      // only the customer-supplied parts of the request.
      const compare = (value) =>
        JSON.stringify([
          value.location,
          value.fulfillment,
          value.fulfillment === "pickup" ? null : value.date,
          value.deliveryAddress,
          value.notes,
          value.idempotencyKey,
          value.lines.map((l) => [l.sku, l.qty, l.expectedPriceCents]),
        ]);
      if (compare(existing.request_body) !== compare(input))
        throw new StoreError(
          "This request ID was already used for a different order.",
          409,
        );
      const lines =
        await tx`SELECT * FROM scr_order_lines WHERE order_id=${existing.id} ORDER BY sku`;
      return { order: orderView(existing, lines), replayed: true };
    }
    const rows =
      await tx`SELECT i.*,p.name,p.size,p.price_cents,p.active FROM scr_inventory i JOIN scr_products p USING (sku) WHERE i.location=${input.location} AND i.sku IN ${tx(input.lines.map((l) => l.sku))} ORDER BY i.sku FOR UPDATE OF i,p`;
    const priced = input.lines.map((line) => {
      const product = rows.find((p) => p.sku === line.sku);
      if (
        !product ||
        !product.active ||
        product.on_hand - product.reserved < line.qty
      )
        throw new StoreError(
          `Stock changed for ${product?.name || line.sku}. Refresh your cart and try again.`,
          409,
        );
      if (product.price_cents !== line.expectedPriceCents)
        throw new StoreError(
          `The price changed for ${product.name}. Review the updated price before submitting.`,
          409,
        );
      return {
        ...line,
        name: product.name,
        size: product.size,
        price_cents: product.price_cents,
      };
    });
    const subtotal = priced.reduce((sum, l) => sum + l.qty * l.price_cents, 0);
    integer(subtotal, "order total", 0, 100000000);
    const id = "SCR-" + crypto.randomUUID();
    const [order] =
      await tx`INSERT INTO scr_orders (id,customer_id,idempotency_key,request_body,location,fulfillment,fulfillment_date,delivery_address,notes,subtotal_cents,payment_method) VALUES (${id},${user.id},${input.idempotencyKey},${tx.json(input)},${input.location},${input.fulfillment},${input.date},${input.deliveryAddress},${input.notes},${subtotal},${input.fulfillment === "pickup" ? "pay_at_pickup" : "pay_at_handoff"}) RETURNING *`;
    for (const line of priced) {
      await tx`INSERT INTO scr_order_lines (order_id,sku,name,size,qty,price_cents) VALUES (${id},${line.sku},${line.name},${line.size},${line.qty},${line.price_cents})`;
      await tx`UPDATE scr_inventory SET reserved=reserved+${line.qty},version=version+1 WHERE location=${input.location} AND sku=${line.sku}`;
    }
    await tx`INSERT INTO scr_audit (actor_id,action,details) VALUES (${user.id},'order_created',${tx.json({ orderId: id, location: input.location })})`;
    return { order: orderView(order, priced) };
  });
}

async function updateOrder(sql, user, body) {
  const id = text(body.orderId, "order ID", 80);
  return sql.begin(async (tx) => {
    const [order] =
      await tx`SELECT * FROM scr_orders WHERE id=${id} FOR UPDATE`;
    if (!order || (user.role !== "admin" && order.customer_id !== user.id))
      throw new StoreError("Order not found.", 404);
    const lines =
      await tx`SELECT * FROM scr_order_lines WHERE order_id=${id} ORDER BY sku`;
    if (order.status === body.status) {
      if (user.role !== "admin" && body.status !== "Cancelled")
        throw new StoreError("Staff access is required.", 403);
      return { order: orderView(order, lines), replayed: true };
    }
    if (order.status !== body.expectedStatus)
      throw new StoreError(
        "Another person updated this order. Refresh before continuing.",
        409,
      );
    validateTransition(order, body.status, user);
    const finalCents =
      body.status === "Done"
        ? integer(body.finalCents, "amount collected", 0, 100000000)
        : null;
    if (FINAL_STATUSES.includes(body.status)) {
      await tx`SELECT sku FROM scr_inventory WHERE location=${order.location} AND sku IN ${tx(lines.map((l) => l.sku))} ORDER BY sku FOR UPDATE`;
      for (const line of lines) {
        const changed =
          await tx`UPDATE scr_inventory SET reserved=reserved-${line.qty},on_hand=on_hand-${body.status === "Done" ? line.qty : 0},version=version+1 WHERE location=${order.location} AND sku=${line.sku} AND reserved>=${line.qty} RETURNING sku`;
        if (!changed.length)
          throw new StoreError(
            "Inventory reconciliation is required. No changes were saved.",
            409,
          );
      }
    }
    const [updated] =
      await tx`UPDATE scr_orders SET status=${body.status},final_cents=${finalCents},updated_at=now() WHERE id=${id} RETURNING *`;
    await tx`INSERT INTO scr_audit (actor_id,action,details) VALUES (${user.id},'order_status',${tx.json({ orderId: id, from: order.status, to: body.status, finalCents })})`;
    return { order: orderView(updated, lines) };
  });
}

export async function dispatch(sql, user, body) {
  if (!user?.id || !user.email)
    throw new StoreError("Sign in to continue.", 401);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new StoreError("Invalid request.");
  const action = body.action;
  if (SCAN_ACTIONS.includes(action)) return scanning(sql, user, body);
  if (
    [
      "initialize",
      "staff",
      "save-product",
      "inventory",
      "save-inbound",
      "arrive-inbound",
      "audit",
    ].includes(action)
  )
    requireAdmin(user);
  if (action === "initialize") {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(4400144)`;
      await tx.unsafe(SCHEMA);
    });
    return { initialized: true };
  }
  if (action === "delete-profile") {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"account:" + user.id},0))`;
      await tx`SELECT user_id FROM scr_customers WHERE user_id=${user.id} FOR UPDATE`;
      const active =
        await tx`SELECT id FROM scr_orders WHERE customer_id=${user.id} AND status NOT IN ('Done','Cancelled') LIMIT 1`;
      if (active.length)
        throw new StoreError(
          "Cancel or complete your active orders before deleting your account.",
          409,
        );
      await tx`INSERT INTO scr_deleted_users (user_id) VALUES (${user.id}) ON CONFLICT DO NOTHING`;
      // Retain anonymous order lines for business accounting; remove customer data.
      await tx`UPDATE scr_orders SET customer_id=NULL,delivery_address='',notes='',request_body='{}'::jsonb WHERE customer_id=${user.id}`;
      await tx`UPDATE scr_audit SET actor_id='deleted' WHERE actor_id=${user.id}`;
      await tx`DELETE FROM scr_customers WHERE user_id=${user.id}`;
    });
    return { profileDeleted: true };
  }
  const profile = await customer(sql, user);
  if (action === "me") return profileResult(profile);
  if (action === "update-me") {
    const first = text(body.firstName, "first name", 80),
      last = text(body.lastName, "last name", 80),
      location = store(body.preferredStore);
    const phone = text(body.phone ?? profile.phone, "phone number", 30, false);
    if (phone && !/^\+?[\d ()-]{7,30}$/.test(phone))
      throw new StoreError("Enter a valid phone number.");
    const [row] =
      await sql`UPDATE scr_customers SET first_name=${first},last_name=${last},phone=${phone},preferred_store=${location},updated_at=now() WHERE user_id=${user.id} RETURNING *`;
    return profileResult(row);
  }
  if (action === "consent") {
    if (
      typeof body.smsConsent !== "boolean" ||
      typeof body.emailConsent !== "boolean"
    )
      throw new StoreError("Choose your contact preferences.");
    if (body.smsConsent && !profile.phone)
      throw new StoreError(
        "Add your phone number in Profile before selecting texts.",
      );
    const source = text(body.source ?? "profile", "source", 100);
    await sql`INSERT INTO scr_consent (user_id,sms_consent,email_consent,source,disclosure_version) VALUES (${user.id},${body.smsConsent},${body.emailConsent},${source},'scr-contact-2026-10-11') ON CONFLICT (user_id) DO UPDATE SET sms_consent=EXCLUDED.sms_consent,email_consent=EXCLUDED.email_consent,source=EXCLUDED.source,disclosure_version=EXCLUDED.disclosure_version,updated_at=now()`;
    return { saved: true };
  }
  if (action === "get-consent") {
    const [row] =
      await sql`SELECT sms_consent,email_consent FROM scr_consent WHERE user_id=${user.id}`;
    return {
      smsConsent: !!row?.sms_consent,
      emailConsent: !!row?.email_consent,
    };
  }
  if (action === "dashboard") {
    const location = store(body.location);
    const rows =
      await sql`SELECT p.*,i.*,EXISTS(SELECT 1 FROM scr_favorites f WHERE f.user_id=${user.id} AND f.sku=p.sku) AS is_favorite FROM scr_products p JOIN scr_inventory i USING (sku) WHERE i.location=${location} AND p.active=true ORDER BY p.category,p.name`;
    const products = rows.map(productView),
      orders = await getOrders(sql, user.id, location);
    const past = orders.filter((o) => FINAL_STATUSES.includes(o.status)),
      active = orders.filter((o) => !FINAL_STATUSES.includes(o.status));
    const previousSkus = new Set(
      past
        .filter((o) => o.status === "Done")
        .flatMap((o) => o.lines.map((l) => l.sku)),
    );
    const trucks =
      await sql`SELECT id,location,supplier,to_char(eta,'YYYY-MM-DD') AS eta,note FROM scr_inbound WHERE location=${location} AND arrived=false ORDER BY eta LIMIT 100`;
    return {
      location,
      orderAgain: products.filter((p) => previousSkus.has(p.sku)),
      favorites: products.filter((p) => p.isFavorite),
      categories: [...new Set(products.map((p) => p.category))].map((name) => ({
        name,
        products: products.filter((p) => p.category === name),
      })),
      activeOrders: active,
      pastOrders: past,
      trucks,
    };
  }
  if (action === "favorite") {
    const sku = text(body.sku, "SKU", 80);
    if (typeof body.favorite !== "boolean")
      throw new StoreError("Invalid favorite selection.");
    const [product] =
      await sql`SELECT sku FROM scr_products WHERE sku=${sku} AND active=true`;
    if (!product) throw new StoreError("Product not found.", 404);
    if (body.favorite)
      await sql`INSERT INTO scr_favorites (user_id,sku) VALUES (${user.id},${sku}) ON CONFLICT DO NOTHING`;
    else
      await sql`DELETE FROM scr_favorites WHERE user_id=${user.id} AND sku=${sku}`;
    return { saved: true };
  }
  if (action === "orders") return { orders: await getOrders(sql, user.id) };
  if (action === "find-order") {
    const key = text(body.idempotencyKey, "request ID", 80);
    const [row] =
      await sql`SELECT * FROM scr_orders WHERE customer_id=${user.id} AND idempotency_key=${key}`;
    if (!row) return { order: null };
    const lines =
      await sql`SELECT * FROM scr_order_lines WHERE order_id=${row.id} ORDER BY sku`;
    return { order: orderView(row, lines) };
  }
  if (action === "order") {
    const id = text(body.orderId, "order ID", 80);
    const [row] =
      user.role === "admin"
        ? await sql`SELECT * FROM scr_orders WHERE id=${id}`
        : await sql`SELECT * FROM scr_orders WHERE id=${id} AND customer_id=${user.id}`;
    if (!row) throw new StoreError("Order not found.", 404);
    const lines =
      await sql`SELECT * FROM scr_order_lines WHERE order_id=${id} ORDER BY sku`;
    return { order: orderView(row, lines) };
  }
  if (action === "place-order") return placeOrder(sql, user, body);
  if (action === "update-order") return updateOrder(sql, user, body);
  if (action === "my-qr") return { token: profile.qr_token };
  if (action === "member-qr") {
    // Possessing a printed QR never grants access to a customer's identity/orders.
    if (body.token !== profile.qr_token)
      throw new StoreError(
        "Sign in with the account that owns this QR code.",
        403,
      );
    const orders = await getOrders(sql, user.id);
    const lastOrder = orders.find((o) => o.status === "Done") ?? null;
    return {
      member: { firstName: profile.first_name, store: profile.preferred_store },
      lastOrder,
      reorder: lastOrder
        ? { location: lastOrder.location, lines: lastOrder.lines }
        : null,
    };
  }
  if (action === "staff") {
    const location = store(body.location);
    const rows =
      await sql`SELECT o.*,c.first_name,c.last_name,c.phone,c.email FROM scr_orders o LEFT JOIN scr_customers c ON c.user_id=o.customer_id WHERE o.location=${location} AND o.status NOT IN ('Done','Cancelled') ORDER BY o.created_at LIMIT 500`;
    if (!rows.length) return { orders: [] };
    const lines =
      await sql`SELECT * FROM scr_order_lines WHERE order_id IN ${sql(rows.map((o) => o.id))} ORDER BY sku`;
    return {
      orders: rows.map((o) => ({
        ...orderView(
          o,
          lines.filter((l) => l.order_id === o.id),
        ),
        customerName: [o.first_name, o.last_name].filter(Boolean).join(" "),
        phone: o.phone,
        email: o.email,
      })),
    };
  }
  if (action === "inventory") {
    const location = store(body.location);
    const rows =
      await sql`SELECT p.*,i.on_hand,i.reserved,i.reorder_threshold,i.version FROM scr_products p LEFT JOIN scr_inventory i ON i.sku=p.sku AND i.location=${location} ORDER BY p.name LIMIT 5000`;
    return { products: rows.map(productView) };
  }
  if (action === "save-product") {
    const sku = text(body.sku, "SKU", 80),
      name = text(body.name, "product name", 160),
      size = text(body.size ?? "", "package size", 120, false),
      category = text(body.category, "category", 100);
    const price = integer(body.priceCents, "price in cents", 0, 1000000),
      qty = integer(body.onHand, "stock count"),
      threshold = integer(body.reorderThreshold ?? 0, "low-stock threshold"),
      location = store(body.location);
    if (typeof body.active !== "boolean")
      throw new StoreError("Choose whether the product is active.");
    await sql.begin(async (tx) => {
      // Serialize creation of a shared SKU across both store locations.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"catalog:" + sku},0))`;
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"inventory:" + location + ":" + sku},0))`;
      // Inventory first for existing products: same lock ordering as checkout.
      const [stock] =
        await tx`SELECT * FROM scr_inventory WHERE location=${location} AND sku=${sku} FOR UPDATE`;
      if (stock && stock.version !== body.expectedVersion)
        throw new StoreError(
          "Stock changed. Reload this product before saving.",
          409,
        );
      if (!stock && body.expectedVersion != null)
        throw new StoreError("Product stock no longer exists.", 409);
      if (stock && qty < stock.reserved)
        throw new StoreError(
          `At least ${stock.reserved} units are reserved by active orders.`,
          409,
        );
      const [catalog] =
        await tx`SELECT catalog_version FROM scr_products WHERE sku=${sku} FOR UPDATE`;
      if (catalog && catalog.catalog_version !== body.expectedCatalogVersion)
        throw new StoreError(
          "This SKU already exists or its catalog details changed. Select it again before saving.",
          409,
        );
      await tx`INSERT INTO scr_products (sku,name,size,category,price_cents,active) VALUES (${sku},${name},${size},${category},${price},${body.active}) ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name,size=EXCLUDED.size,category=EXCLUDED.category,price_cents=EXCLUDED.price_cents,active=EXCLUDED.active,catalog_version=scr_products.catalog_version+1,updated_at=now()`;
      await tx`INSERT INTO scr_inventory (location,sku,on_hand,reorder_threshold) VALUES (${location},${sku},${qty},${threshold}) ON CONFLICT (location,sku) DO UPDATE SET on_hand=EXCLUDED.on_hand,reorder_threshold=EXCLUDED.reorder_threshold,version=scr_inventory.version+1`;
      await tx`INSERT INTO scr_audit (actor_id,action,details) VALUES (${user.id},'product_saved',${tx.json({ sku, location, onHand: qty, priceCents: price })})`;
    });
    return { saved: true };
  }
  if (action === "audit") {
    return {
      events:
        await sql`SELECT action,details,created_at FROM scr_audit ORDER BY id DESC LIMIT 100`,
    };
  }
  if (action === "save-inbound") {
    const location = store(body.location),
      supplier = text(body.supplier, "supplier name", 160),
      eta = text(body.eta, "arrival date", 10),
      note = text(body.note ?? "", "shipment note", 500, false);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(eta) ||
      !Number.isFinite(Date.parse(eta)) ||
      new Date(`${eta}T12:00:00Z`).toISOString().slice(0, 10) !== eta
    )
      throw new StoreError("Enter a valid arrival date.");
    const id = crypto.randomUUID();
    await sql`INSERT INTO scr_inbound (id,location,supplier,eta,note) VALUES (${id},${location},${supplier},${eta},${note})`;
    return { saved: true };
  }
  if (action === "arrive-inbound") {
    const id = text(body.id, "shipment ID", 80);
    const rows =
      await sql`UPDATE scr_inbound SET arrived=true WHERE id=${id} RETURNING id`;
    if (!rows.length) throw new StoreError("Shipment not found.", 404);
    return { saved: true };
  }
  throw new StoreError("Unknown store action.", 404);
}
