// Mock server used while USE_MOCK is true. Mirrors the real API's shapes.
const STORES = ["LaBelle", "Fort Myers"];
const PROFILE_KEY = "scr_mock_profile";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const CATALOG = [
  { sku: "PUR-LAY-50", name: "Purina Layena Pellets", size: "50 lb bag", category: "Poultry", price: 24.99 },
  { sku: "PUR-SCR-40", name: "Purina Scratch Grains", size: "40 lb bag", category: "Poultry", price: 18.49 },
  { sku: "STR-SWT-50", name: "Sweet Feed 12%", size: "50 lb bag", category: "Horse", price: 19.99 },
  { sku: "TC-SEN-50", name: "Triple Crown Senior", size: "50 lb bag", category: "Horse", price: 34.99 },
  { sku: "CTL-CUB-50", name: "Range Cattle Cubes 20%", size: "50 lb bag", category: "Cattle", price: 16.99 },
  { sku: "MIN-BLK-50", name: "Trace Mineral Block", size: "50 lb block", category: "Cattle", price: 14.49 },
  { sku: "GOT-PEL-50", name: "Goat & Sheep Pellets 16%", size: "50 lb bag", category: "Goat & Sheep", price: 21.99 },
  { sku: "HAY-TIM-BL", name: "Timothy Hay", size: "Square bale", category: "Hay & Bedding", price: 22.0 },
  { sku: "SHV-PIN-CU", name: "Pine Shavings", size: "12 cu ft", category: "Hay & Bedding", price: 9.99 },
];

// [available, reorderThreshold]
const STOCK = {
  LaBelle: {
    "PUR-LAY-50": [42, 10], "PUR-SCR-40": [6, 8], "STR-SWT-50": [30, 10], "TC-SEN-50": [0, 6],
    "CTL-CUB-50": [55, 15], "MIN-BLK-50": [12, 5], "GOT-PEL-50": [4, 6], "HAY-TIM-BL": [80, 20],
  },
  "Fort Myers": {
    "PUR-LAY-50": [7, 10], "PUR-SCR-40": [25, 8], "STR-SWT-50": [0, 10], "TC-SEN-50": [14, 6],
    "CTL-CUB-50": [20, 15], "MIN-BLK-50": [9, 5], "GOT-PEL-50": [18, 6], "SHV-PIN-CU": [60, 15],
  },
};

const TRUCKS = [
  { id: "TRK-201", location: "LaBelle", supplier: "Purina Mills", eta: day(3), note: "Poultry & horse feed restock" },
  { id: "TRK-202", location: "Fort Myers", supplier: "Triple Crown", eta: day(2), note: "Horse feed & sweet feed" },
  { id: "TRK-203", location: "Fort Myers", supplier: "Southern States", eta: day(6), note: "Cattle cubes & minerals" },
];

const orders = [
  {
    id: "SO-10482", status: "Picking", location: "LaBelle", fulfillment: "pickup", date: day(1),
    createdAt: day(0), holdAmount: 96.21, finalAmount: null, releasedAmount: null,
    lines: [{ sku: "PUR-LAY-50", name: "Purina Layena Pellets", qty: 2 }, { sku: "CTL-CUB-50", name: "Range Cattle Cubes 20%", qty: 2 }],
  },
  {
    id: "SO-10311", status: "Done", location: "LaBelle", fulfillment: "delivery", date: day(-12),
    createdAt: day(-14), holdAmount: 74.95, finalAmount: 68.46, releasedAmount: 6.49,
    lines: [{ sku: "SHV-PIN-CU", name: "Pine Shavings", qty: 3 }, { sku: "HAY-TIM-BL", name: "Timothy Hay", qty: 2 }],
  },
];

let session = { access: null };
let seq = 10490;

const getProfile = () => JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
const customer = () => {
  const p = getProfile();
  return {
    id: "cus_mock_001", phone: p.phone || "2395550142", firstName: p.firstName || "", lastName: p.lastName || "",
    email: p.email || "", preferredStore: p.preferredStore || "LaBelle", card: { brand: "Visa", last4: "4242" },
  };
};
const needsName = () => !getProfile().firstName;

const productsFor = (location) =>
  CATALOG.filter((p) => STOCK[location][p.sku]).map((p) => ({
    ...p, available: STOCK[location][p.sku][0], reorderThreshold: STOCK[location][p.sku][1],
  }));

const ok = (data) => ({ status: 200, data });
const fail = (status, error) => ({ status, data: { error } });

const OPTIN_KEY = "scr_mock_optin";
const MEMBER_TOKEN = "mb_scr_demo";

function recordOptIn(body) {
  let digits = String(body.phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return fail(400, "Enter a valid 10-digit phone number.");
  if (!body.smsConsent) return fail(400, "Text-message consent is required to continue.");
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) return fail(400, "Enter a valid email address.");
  localStorage.setItem(OPTIN_KEY, JSON.stringify({
    phone: digits, email: body.email || "", smsConsent: true, emailConsent: !!body.emailConsent,
    source: body.source || "qr", at: new Date().toISOString(),
  }));
  return ok({ ok: true });
}

function memberByQr(token) {
  if (!token || token.length < 4) return fail(404, "This QR code isn't recognized.");
  const past = orders.find((o) => ["Done", "Cancelled"].includes(o.status)) || orders[0];
  const products = productsFor(past.location);
  const lines = (past.lines || []).map((l) => {
    const p = products.find((x) => x.sku === l.sku);
    return { sku: l.sku, name: p?.name || l.name, size: p?.size || "", price: p?.price ?? 0, qty: l.qty };
  });
  const lastOrder = { ...past, lines };
  return ok({
    member: {
      id: "cus_mock_001",
      firstName: getProfile().firstName || "SCR",
      lastName: getProfile().lastName || "Demo",
      store: getProfile().preferredStore || "LaBelle",
    },
    lastOrder,
    reorder: { location: lastOrder.location, lines },
  });
}

function issueTokens() {
  session.access = `mock-access-${Date.now()}`;
  return { accessToken: session.access, refreshToken: `mock-refresh-${Date.now()}` };
}

export function setMockSession(token) { session.access = token; }

function handleAuth(path, body) {
  if (path === "/auth/send-code") {
    let digits = String(body.phone || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length !== 10) return fail(400, "Enter a valid 10-digit phone number.");
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...getProfile(), phone: digits }));
    return ok({ sent: true });
  }
  if (path === "/auth/verify") {
    if (String(body.code) !== "123456") return fail(400, "That code isn't right. Check your texts and try again.");
    return ok({ ...issueTokens(), needsName: needsName(), customer: customer() });
  }
  if (path === "/auth/refresh") {
    if (!String(body.refreshToken || "").startsWith("mock-refresh")) return fail(401, "Session expired.");
    return ok(issueTokens());
  }
  return fail(404, "Not found.");
}

function dashboard(location) {
  if (!STORES.includes(location)) return fail(400, "Unknown store.");
  const products = productsFor(location);
  const pick = (skus) => products.filter((p) => skus.includes(p.sku));
  const categories = [...new Set(products.map((p) => p.category))].map((name) => ({
    name, products: products.filter((p) => p.category === name),
  }));
  return ok({
    location, stores: STORES,
    orderAgain: pick(["PUR-LAY-50", "CTL-CUB-50", "SHV-PIN-CU", "HAY-TIM-BL"]),
    favorites: pick(["TC-SEN-50", "MIN-BLK-50", "GOT-PEL-50"]),
    categories,
    activeOrders: orders.filter((o) => !["Done", "Cancelled"].includes(o.status)),
    pastOrders: orders.filter((o) => ["Done", "Cancelled"].includes(o.status)),
    trucks: TRUCKS.filter((t) => t.location === location),
  });
}

function placeHold(body) {
  const { location, fulfillment, deliveryDate, lines = [] } = body;
  if (!STORES.includes(location)) return fail(400, "Pick a store.");
  if (!lines.length) return fail(400, "Your cart is empty.");
  if (fulfillment === "delivery" && (!deliveryDate || deliveryDate < day(1))) return fail(400, "Choose a delivery date from tomorrow on.");
  const products = productsFor(location);
  let subtotal = 0;
  const orderLines = [];
  for (const line of lines) {
    const p = products.find((x) => x.sku === line.sku);
    if (!p || p.available < line.qty) return fail(409, `Only ${p ? p.available : 0} of ${p ? p.name : line.sku} left at ${location}.`);
    subtotal += p.price * line.qty;
    orderLines.push({ sku: p.sku, name: p.name, qty: line.qty });
  }
  orderLines.forEach((l) => { STOCK[location][l.sku][0] -= l.qty; });
  const order = {
    id: `SO-${++seq}`, status: "Pending Ticket", location, fulfillment,
    date: fulfillment === "delivery" ? deliveryDate : day(0), createdAt: day(0),
    holdAmount: Math.round(subtotal * 1.1 * 100) / 100, finalAmount: null, releasedAmount: null, lines: orderLines,
  };
  orders.unshift(order);
  return ok({ needsCard: false, order });
}

export async function mockTransport(method, fullPath, body = {}, headers = {}) {
  await wait(350 + Math.random() * 350);
  const [path, qs] = fullPath.split("?");
  const query = new URLSearchParams(qs);
  if (path.startsWith("/auth/")) return handleAuth(path, body || {});
  if (`${method} ${path}` === "POST /optin") return recordOptIn(body || {});
  const qrMatch = path.match(/^\/members\/qr\/(.+)$/);
  if (method === "GET" && qrMatch) return memberByQr(decodeURIComponent(qrMatch[1]));
  if (!session.access || headers.Authorization !== `Bearer ${session.access}`) return fail(401, "Unauthorized");

  const route = `${method} ${path}`;
  if (route === "GET /me") return ok({ customer: customer(), needsName: needsName() });
  if (route === "GET /me/qr") return ok({ token: MEMBER_TOKEN });
  if (route === "PATCH /me") {
    const { firstName, lastName, email, preferredStore } = body;
    if (!firstName || !lastName) return fail(400, "First and last name are required.");
    if (!/^\S+@\S+\.\S+$/.test(email || "")) return fail(400, "Enter a valid email address.");
    if (!STORES.includes(preferredStore)) return fail(400, "Choose your preferred store.");
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...getProfile(), firstName, lastName, email, preferredStore }));
    return ok({ customer: customer(), needsName: false });
  }
  if (route === "GET /dashboard") return dashboard(query.get("location"));
  if (route === "POST /orders") return placeHold(body);
  if (route === "DELETE /me") {
    localStorage.removeItem(PROFILE_KEY);
    session.access = null;
    return ok({ deleted: true });
  }
  return fail(404, "Not found.");
}