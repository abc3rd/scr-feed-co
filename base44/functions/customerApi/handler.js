const STORES = ['LaBelle', 'Fort Myers'];
const TERMINAL = ['Done', 'Cancelled'];
class ApiFailure extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const respond = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, message) => { throw new ApiFailure(status, message); };
const text = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';
async function readBody(req) {
  const reader = req.body?.getReader();
  if (!reader) fail(400, 'A request body is required.');
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32000) { await reader.cancel(); fail(413, 'The request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail(400, 'Invalid request.'); }
}
const customer = (user, profile) => ({
  id: user.id, email: profile?.email || user.email || '', phone: profile?.phone || '',
  firstName: profile?.firstName || '', lastName: profile?.lastName || '',
  preferredStore: profile?.preferredStore || STORES[0], card: null,
});
const me = (user, profile) => ({ customer: customer(user, profile), needsName: !profile?.firstName || !profile?.lastName });
async function memberToken(id) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`SCR barn QR v1:${id}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
async function profileFor(admin, user) {
  return (await admin.entities.CustomerProfile.filter({ user_id: user.id }, '-created_date', 1))[0] || null;
}
function productShape(record) {
  if (!record.sku || !record.name || !Number.isSafeInteger(record.price_cents) || record.price_cents < 0 ||
      !Number.isSafeInteger(record.available) || record.available < 0) fail(503, 'The store catalog needs attention. Please contact the store.');
  return {
    sku: record.sku, name: record.name, size: record.size || '', category: record.category,
    price: record.price_cents / 100, available: record.available, reorderThreshold: record.reorder_threshold || 0,
  };
}
export function createCustomerHandler({ createClient }) {
  return async function customerApi(req) {
    if (req.method !== 'POST') return respond({ error: 'Use POST.' }, 405);
    try {
      const client = createClient(req);
      let user;
      try { user = await client.auth.me(); }
      catch (error) {
        if ([401, 403].includes(error?.status || error?.response?.status)) fail(401, 'Sign in to continue.');
        throw error;
      }
      if (!user?.id) fail(401, 'Sign in to continue.');
      const body = await readBody(req);
      const action = body?.action;
      const input = body?.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {};
      const admin = client.asServiceRole;
      if (action === 'checkout') fail(503, 'Online payment is not connected. Please contact the store to complete your order.');
      if (action === 'myQr') return respond({ token: await memberToken(user.id) });
      if (action === 'yard') {
        if (user.role !== 'admin') fail(403, 'Staff access is required.');
        const orders = await admin.entities.Order.list('-created_date', 200);
        return respond({ orders: orders.filter((order) => !TERMINAL.includes(order.status)) });
      }
      if (action === 'order') {
        const id = text(input.id, 128);
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) fail(400, 'Invalid order.');
        const order = await admin.entities.Order.get(id);
        if (!order || (order.user_id !== user.id && user.role !== 'admin')) fail(404, 'Order not found.');
        const { user_id, ...details } = order;
        return respond({ order: details });
      }
      if (action === 'dashboard') {
        const location = input.location;
        if (!STORES.includes(location)) fail(400, 'Choose a valid store.');
        const [records, orders, trucks, profile] = await Promise.all([
          admin.entities.Product.filter({ location, is_active: true }, 'name', 500),
          admin.entities.Order.filter({ user_id: user.id, location }, '-created_date', 100),
          admin.entities.TruckArrival.filter({ location, is_active: true }, 'eta', 100),
          profileFor(admin, user),
        ]);
        const products = records.map(productShape);
        const bySku = new Map(products.map((p) => [p.sku, p]));
        const recentSkus = new Set(orders.flatMap((o) => o.lines || []).map((line) => line.sku));
        const favorites = new Set(profile?.favorite_skus || []);
        return respond({
          location, stores: STORES,
          categories: [...new Set(products.map((p) => p.category))].map((name) => ({ name, products: products.filter((p) => p.category === name) })),
          orderAgain: [...recentSkus].map((sku) => bySku.get(sku)).filter(Boolean),
          favorites: products.filter((p) => favorites.has(p.sku)),
          activeOrders: orders.filter((o) => !TERMINAL.includes(o.status)),
          pastOrders: orders.filter((o) => TERMINAL.includes(o.status)),
          trucks: trucks.map(({ id, supplier, eta, note }) => ({ id, supplier, eta, note })),
          checkout: { enabled: false },
        });
      }
      if (action === 'deleteAccount') {
        if (input.confirm !== true) fail(400, 'Confirm account deletion.');
        if (user.role === 'admin') fail(409, 'Transfer store administration before deleting this account.');
        const orders = await admin.entities.Order.filter({ user_id: user.id }, '-created_date', 1000);
        if (orders.length === 1000) fail(409, 'Contact the store to process account deletion.');
        if (orders.some((o) => !TERMINAL.includes(o.status))) fail(409, 'Complete or cancel your active orders before deleting your account.');
        // Preserve store transaction records while removing their account association.
        for (const order of orders) await admin.entities.Order.update(order.id, { user_id: null });
        await admin.entities.CustomerConsent.deleteMany({ user_id: user.id });
        await admin.entities.CustomerProfile.deleteMany({ user_id: user.id });
        // Do not report deletion success if the platform refuses user deletion.
        await admin.entities.User.delete(user.id);
        return respond({ deleted: true });
      }
      const profile = await profileFor(admin, user);
      if (action === 'me') return respond(me(user, profile));
      if (action === 'updateProfile') {
        const fields = {
          firstName: text(input.firstName), lastName: text(input.lastName), email: text(input.email, 254),
          preferredStore: input.preferredStore,
        };
        if (!fields.firstName || !fields.lastName || !/^\S+@\S+\.\S+$/.test(fields.email) || !STORES.includes(fields.preferredStore)) fail(400, 'Enter your name, email, and preferred store.');
        const updated = profile
          ? await admin.entities.CustomerProfile.update(profile.id, fields)
          : await admin.entities.CustomerProfile.create({ ...fields, user_id: user.id });
        return respond(me(user, updated));
      }
      if (action === 'saveConsent') {
        const phone = text(input.phone, 20).replace(/\D/g, '');
        const email = text(input.email, 254);
        if (input.smsConsent !== true && input.emailConsent !== true) fail(400, 'Choose at least one contact preference.');
        if (input.smsConsent === true && !/^\d{10}$/.test(phone)) fail(400, 'Enter a valid mobile number.');
        if (input.emailConsent === true && !/^\S+@\S+\.\S+$/.test(email)) fail(400, 'Enter a valid email address.');
        await admin.entities.CustomerConsent.create({
          user_id: user.id, phone: input.smsConsent === true ? phone : '', email: input.emailConsent === true ? email : '',
          sms_consent: input.smsConsent === true, email_consent: input.emailConsent === true,
          source: text(input.source, 40), recorded_at: new Date().toISOString(), version: '2026-10-12',
        });
        return respond({ saved: true });
      }
      if (action === 'member') {
        // The QR is a selector, never permission to disclose another customer's history.
        if (input.token !== await memberToken(user.id)) fail(404, 'This QR is not linked to your account.');
        const orders = await admin.entities.Order.filter({ user_id: user.id }, '-created_date', 1);
        const last = orders[0] || null;
        return respond({ member: customer(user, profile), lastOrder: last,
          reorder: last ? { location: last.location, lines: last.lines || [] } : null });
      }
      fail(400, 'Unknown request.');
    } catch (error) {
      if (error instanceof ApiFailure) return respond({ error: error.message }, error.status);
      if (error?.status === 404 || error?.response?.status === 404) return respond({ error: 'The requested record or store service is unavailable.' }, 404);
      return respond({ error: 'The store service is unavailable. Please try again.' }, 503);
    }
  };
}
