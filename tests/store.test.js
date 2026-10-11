import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../base44/functions/store-api/service.js";
import { orderInput, localDate } from "../base44/functions/store-api/domain.js";
import { testDatabase } from "./database.js";

const admin = { id: "test-admin", email: "staff@example.test", role: "admin" };
const buyer = { id: "test-buyer", email: "buyer@example.test", role: "user" };
const other = { id: "test-other", email: "other@example.test", role: "user" };
const product = {
  action: "save-product",
  sku: "TEST-FEED",
  name: "Test feed",
  size: "Test package",
  category: "Test category",
  priceCents: 2500,
  onHand: 8,
  reorderThreshold: 2,
  active: true,
  location: "LaBelle",
  expectedVersion: null,
};
const request = (qty = 2, key = crypto.randomUUID()) => ({
  action: "place-order",
  location: "LaBelle",
  fulfillment: "pickup",
  idempotencyKey: key,
  lines: [{ sku: "TEST-FEED", qty, expectedPriceCents: 2500 }],
});

async function setup(t) {
  const db = await testDatabase();
  t.after(() => db.close());
  await dispatch(db.sql, admin, { action: "initialize" });
  await dispatch(db.sql, admin, product);
  for (const user of [buyer, other])
    await dispatch(db.sql, user, {
      action: "update-me",
      firstName: "Test",
      lastName: "Customer",
      preferredStore: "LaBelle",
    });
  return Object.assign((user, body) => dispatch(db.sql, user, body), {
    sql: db.sql,
  });
}

test("validates quantity, duplicates, prices, store, and real local delivery dates", () => {
  assert.equal(localDate(new Date("2026-10-12T02:00:00Z")), "2026-10-11");
  for (const qty of [0, -1, 1.5, NaN, 10001])
    assert.throws(() => orderInput(request(qty)));
  assert.throws(() =>
    orderInput({
      ...request(),
      lines: [...request().lines, ...request().lines],
    }),
  );
  assert.throws(() => orderInput({ ...request(), location: "Unknown" }));
  assert.throws(() =>
    orderInput({ ...request(), lines: [{ sku: "TEST-FEED", qty: 1 }] }),
  );
  assert.throws(() =>
    orderInput(
      {
        ...request(),
        fulfillment: "delivery",
        deliveryDate: "2026-02-30",
        deliveryAddress: "Test address",
      },
      new Date("2026-02-01T12:00Z"),
    ),
  );
  assert.throws(() =>
    orderInput(
      {
        ...request(),
        fulfillment: "delivery",
        deliveryDate: "2026-10-11",
        deliveryAddress: "Test address",
      },
      new Date("2026-10-11T12:00Z"),
    ),
  );
});

test("empty catalog and server-side staff permissions", async (t) => {
  const db = await testDatabase();
  t.after(() => db.close());
  await assert.rejects(dispatch(db.sql, buyer, { action: "initialize" }), {
    status: 403,
  });
  await dispatch(db.sql, admin, { action: "initialize" });
  const dashboard = await dispatch(db.sql, buyer, {
    action: "dashboard",
    location: "LaBelle",
  });
  assert.deepEqual(dashboard.categories, []);
  assert.deepEqual(dashboard.activeOrders, []);
  for (const action of ["staff", "inventory", "save-product", "audit"])
    await assert.rejects(
      dispatch(db.sql, buyer, { action, location: "LaBelle" }),
      { status: 403 },
    );
  await assert.rejects(dispatch(db.sql, null, { action: "me" }), {
    status: 401,
  });
});

test("reserves stock, persists orders, and idempotently replays the same request", async (t) => {
  const call = await setup(t),
    input = request();
  const first = await call(buyer, input),
    replay = await call(buyer, input);
  assert.equal(first.order.id, replay.order.id);
  assert.equal(replay.replayed, true);
  assert.equal(first.order.subtotal, 50);
  assert.equal(first.order.finalAmount, null);
  assert.equal(first.order.date, localDate());
  const { products } = await call(admin, {
    action: "inventory",
    location: "LaBelle",
  });
  assert.equal(products[0].onHand, 8);
  assert.equal(products[0].reserved, 2);
  assert.equal(products[0].available, 6);
  const { orders } = await call(buyer, { action: "orders" });
  assert.equal(orders.length, 1);
  await assert.rejects(
    call(buyer, {
      ...input,
      lines: [{ sku: "TEST-FEED", qty: 3, expectedPriceCents: 2500 }],
    }),
    { status: 409 },
  );
  assert.equal(
    (
      await call(buyer, {
        action: "find-order",
        idempotencyKey: input.idempotencyKey,
      })
    ).order.id,
    first.order.id,
  );
  assert.equal(
    (
      await call(other, {
        action: "find-order",
        idempotencyKey: input.idempotencyKey,
      })
    ).order,
    null,
  );
});

test("rejects overselling and price changes without partial reservations", async (t) => {
  const call = await setup(t);
  await assert.rejects(call(buyer, request(9)), { status: 409 });
  await assert.rejects(
    call(buyer, {
      ...request(),
      lines: [{ sku: "TEST-FEED", qty: 1, expectedPriceCents: 1 }],
    }),
    { status: 409 },
  );
  await assert.rejects(
    call(buyer, {
      ...request(),
      lines: [
        { sku: "TEST-FEED", qty: 2, expectedPriceCents: 2500 },
        { sku: "MISSING", qty: 1, expectedPriceCents: 500 },
      ],
    }),
    { status: 409 },
  );
  assert.equal(
    (await call(admin, { action: "inventory", location: "LaBelle" }))
      .products[0].reserved,
    0,
  );
  assert.equal((await call(buyer, { action: "orders" })).orders.length, 0);
});

test("customer cancellation releases reservation and denies cross-account order access", async (t) => {
  const call = await setup(t),
    { order } = await call(buyer, request());
  await assert.rejects(call(other, { action: "order", orderId: order.id }), {
    status: 404,
  });
  await assert.rejects(
    call(other, {
      action: "update-order",
      orderId: order.id,
      status: "Cancelled",
      expectedStatus: order.status,
    }),
    { status: 404 },
  );
  await call(buyer, {
    action: "update-order",
    orderId: order.id,
    status: "Cancelled",
    expectedStatus: order.status,
  });
  const replay = await call(buyer, {
    action: "update-order",
    orderId: order.id,
    status: "Cancelled",
    expectedStatus: order.status,
  });
  assert.equal(replay.replayed, true);
  const p = (await call(admin, { action: "inventory", location: "LaBelle" }))
    .products[0];
  assert.equal(p.onHand, 8);
  assert.equal(p.reserved, 0);
});

test("staff fulfillment deducts physical inventory exactly once and records register total", async (t) => {
  const call = await setup(t),
    { order } = await call(buyer, request());
  await assert.rejects(
    call(buyer, {
      action: "update-order",
      orderId: order.id,
      status: "Picking",
      expectedStatus: "Pending Ticket",
    }),
    { status: 409 },
  );
  await assert.rejects(
    call(admin, {
      action: "update-order",
      orderId: order.id,
      status: "Done",
      expectedStatus: "Pending Ticket",
      finalCents: 5000,
    }),
    { status: 409 },
  );
  for (const [expectedStatus, status] of [
    ["Pending Ticket", "Picking"],
    ["Picking", "Ready"],
  ])
    await call(admin, {
      action: "update-order",
      orderId: order.id,
      status,
      expectedStatus,
    });
  await assert.rejects(
    call(buyer, {
      action: "update-order",
      orderId: order.id,
      status: "Cancelled",
      expectedStatus: "Ready",
    }),
    { status: 409 },
  );
  await assert.rejects(
    call(admin, {
      action: "update-order",
      orderId: order.id,
      status: "Done",
      expectedStatus: "Picking",
      finalCents: 5000,
    }),
    { status: 409 },
  );
  await assert.rejects(
    call(admin, {
      action: "update-order",
      orderId: order.id,
      status: "Done",
      expectedStatus: "Ready",
      finalCents: -1,
    }),
    { status: 400 },
  );
  const done = await call(admin, {
    action: "update-order",
    orderId: order.id,
    status: "Done",
    expectedStatus: "Ready",
    finalCents: 5350,
  });
  assert.equal(done.order.finalAmount, 53.5);
  await call(admin, {
    action: "update-order",
    orderId: order.id,
    status: "Done",
    expectedStatus: "Ready",
    finalCents: 5350,
  });
  const p = (await call(admin, { action: "inventory", location: "LaBelle" }))
    .products[0];
  assert.equal(p.onHand, 6);
  assert.equal(p.reserved, 0);
});

test("inventory updates protect reservations and reject stale versions", async (t) => {
  const call = await setup(t);
  await call(buyer, request(3));
  const stock = (
    await call(admin, { action: "inventory", location: "LaBelle" })
  ).products[0];
  await assert.rejects(
    call(admin, {
      ...product,
      onHand: 8,
      expectedVersion: 1,
      expectedCatalogVersion: stock.catalogVersion,
    }),
    { status: 409 },
  );
  await assert.rejects(
    call(admin, {
      ...product,
      onHand: 2,
      expectedVersion: stock.version,
      expectedCatalogVersion: stock.catalogVersion,
    }),
    { status: 409 },
  );
  await call(admin, {
    ...product,
    onHand: 12,
    expectedVersion: stock.version,
    expectedCatalogVersion: stock.catalogVersion,
  });
  assert.equal(
    (await call(admin, { action: "inventory", location: "LaBelle" }))
      .products[0].available,
    9,
  );
});

test("member QR requires owner login and deletion removes personal data", async (t) => {
  const call = await setup(t),
    { token } = await call(buyer, { action: "my-qr" });
  await assert.rejects(call(other, { action: "member-qr", token }), {
    status: 403,
  });
  const { order } = await call(buyer, request());
  await assert.rejects(call(buyer, { action: "delete-profile" }), {
    status: 409,
  });
  await call(buyer, {
    action: "update-order",
    orderId: order.id,
    status: "Cancelled",
    expectedStatus: "Pending Ticket",
  });
  await call(buyer, { action: "favorite", sku: "TEST-FEED", favorite: true });
  await call(buyer, {
    action: "consent",
    smsConsent: false,
    emailConsent: true,
    source: "test",
  });
  await call(buyer, { action: "delete-profile" });
  await call(buyer, { action: "delete-profile" });
  await assert.rejects(call(buyer, { action: "me" }), { status: 409 });
});

test("catalog conflicts, favorites, contact preferences, and real inbound shipments", async (t) => {
  const call = await setup(t);
  const selected = (
    await call(admin, { action: "inventory", location: "Fort Myers" })
  ).products[0];
  assert.equal(selected.version, null);
  await assert.rejects(call(admin, { ...product, location: "Fort Myers" }), {
    status: 409,
  });
  await call(admin, {
    ...product,
    location: "Fort Myers",
    expectedVersion: null,
    expectedCatalogVersion: selected.catalogVersion,
  });
  await assert.rejects(
    call(admin, {
      ...product,
      expectedVersion: 1,
      expectedCatalogVersion: selected.catalogVersion,
    }),
    { status: 409 },
  );
  await call(buyer, { action: "favorite", sku: "TEST-FEED", favorite: true });
  assert.equal(
    (await call(buyer, { action: "dashboard", location: "LaBelle" })).favorites
      .length,
    1,
  );
  assert.equal(
    (await call(other, { action: "dashboard", location: "LaBelle" })).favorites
      .length,
    0,
  );
  await assert.rejects(
    call(buyer, {
      action: "consent",
      smsConsent: true,
      emailConsent: false,
      source: "test",
    }),
    { status: 400 },
  );
  await call(buyer, {
    action: "consent",
    smsConsent: false,
    emailConsent: true,
    source: "test",
  });
  assert.deepEqual(await call(buyer, { action: "get-consent" }), {
    smsConsent: false,
    emailConsent: true,
  });
  await assert.rejects(
    call(buyer, {
      action: "save-inbound",
      location: "LaBelle",
      supplier: "Test supplier",
      eta: "2026-10-20",
    }),
    { status: 403 },
  );
  await call(admin, {
    action: "save-inbound",
    location: "LaBelle",
    supplier: "Test supplier",
    eta: "2026-10-20",
    note: "Test arrival",
  });
  const { trucks } = await call(buyer, {
    action: "dashboard",
    location: "LaBelle",
  });
  assert.equal(trucks.length, 1);
  assert.equal(trucks[0].eta, "2026-10-20");
  await call(admin, { action: "arrive-inbound", id: trucks[0].id });
  assert.equal(
    (await call(buyer, { action: "dashboard", location: "LaBelle" })).trucks
      .length,
    0,
  );
});

test("existing label matches preserve zeros, enforce staff access, and reject ambiguous mappings", async (t) => {
  const call = await setup(t);
  const code = "001234567890";
  await assert.rejects(
    call(buyer, { action: "lookup-code", code, location: "LaBelle" }),
    /Staff access/,
  );
  assert.equal(
    (await call(admin, { action: "lookup-code", code, location: "LaBelle" }))
      .product,
    null,
  );
  await call(admin, {
    action: "link-code",
    code,
    sku: "TEST-FEED",
    location: "LaBelle",
  });
  const found = await call(admin, {
    action: "lookup-code",
    code,
    location: "LaBelle",
  });
  assert.equal(found.code, code);
  assert.equal(found.product.sku, "TEST-FEED");
  assert.equal(
    (
      await call(admin, {
        action: "lookup-code",
        code: "1234567890",
        location: "LaBelle",
      })
    ).product,
    null,
  );
  await call(admin, { ...product, sku: "OTHER-PACK", name: "Other package" });
  await assert.rejects(
    call(admin, {
      action: "link-code",
      code,
      sku: "OTHER-PACK",
      location: "LaBelle",
    }),
    /another product/,
  );
  const qr = "https://manufacturer.example.test/product?id=feed";
  await call(admin, {
    action: "link-code",
    code: qr,
    sku: "TEST-FEED",
    location: "LaBelle",
  });
  assert.equal(
    (
      await call(admin, {
        action: "lookup-code",
        code: qr,
        location: "LaBelle",
      })
    ).product.sku,
    "TEST-FEED",
  );
  await call(admin, {
    action: "unlink-code",
    code,
    sku: "TEST-FEED",
    location: "LaBelle",
  });
  assert.equal(
    (await call(admin, { action: "lookup-code", code, location: "LaBelle" }))
      .product,
    null,
  );
});

test("stock scans apply once, persist history, protect reservations, and reject stale counts", async (t) => {
  const call = await setup(t),
    code = "TEST-CODE";
  await call(admin, {
    action: "link-code",
    code,
    sku: "TEST-FEED",
    location: "LaBelle",
  });
  const move = {
    action: "move-stock",
    requestId: crypto.randomUUID(),
    code,
    sku: "TEST-FEED",
    location: "LaBelle",
    qty: 5,
    direction: "in",
    reason: "received",
    expectedVersion: 1,
  };
  await call(admin, move);
  assert.equal((await call(admin, move)).replayed, true);
  await assert.rejects(
    call(admin, { ...move, qty: 6 }),
    /different stock movement/,
  );
  await assert.rejects(call(buyer, move), /Staff access/);
  const stock = async () =>
    (await call(admin, { action: "inventory", location: "LaBelle" }))
      .products[0];
  assert.equal((await stock()).onHand, 13);
  await assert.rejects(
    call(admin, { ...move, requestId: crypto.randomUUID() }),
    /Stock changed/,
  );
  await call(buyer, request(4));
  await assert.rejects(
    call(admin, {
      ...move,
      requestId: crypto.randomUUID(),
      qty: 10,
      direction: "out",
      reason: "counter_sale",
      expectedVersion: (await stock()).version,
    }),
    /reserved stock/,
  );
  await call(admin, {
    ...move,
    requestId: crypto.randomUUID(),
    qty: 2,
    direction: "out",
    reason: "counter_sale",
    expectedVersion: (await stock()).version,
  });
  assert.equal((await stock()).onHand, 11);
  assert.equal((await stock()).reserved, 4);
  const history = (
    await call(admin, { action: "stock-moves", location: "LaBelle" })
  ).movements;
  assert.deepEqual(
    history.map((m) => m.delta).sort((a, b) => a - b),
    [-2, 5],
  );
  assert.equal(
    history.every((m) => m.actor_id === admin.id),
    true,
  );
  assert.equal(
    (await call(admin, { action: "stock-moves", location: "Fort Myers" }))
      .movements.length,
    0,
  );
});
