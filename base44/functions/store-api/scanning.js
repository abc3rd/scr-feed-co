import { StoreError, text, integer, store, requireAdmin } from "./domain.js";

export const SCAN_ACTIONS = [
  "lookup-code",
  "link-code",
  "unlink-code",
  "move-stock",
  "stock-moves",
];
function scanCode(value) {
  const code = text(value, "scanned label", 512);
  if (/[\u0000-\u001f\u007f]/.test(code))
    throw new StoreError("This label contains unsupported characters.");
  // Preserve leading zeros and exact QR contents. Never navigate to a scanned URL.
  return code;
}
export async function scanning(sql, user, body) {
  requireAdmin(user);
  const location = store(body.location);
  if (body.action === "stock-moves") {
    return {
      movements:
        await sql`SELECT m.*,p.name,p.size FROM scr_stock_moves m JOIN scr_products p ON p.sku=m.sku WHERE m.location=${location} ORDER BY m.created_at DESC LIMIT 50`,
    };
  }
  const code = scanCode(body.code);
  if (body.action === "lookup-code") {
    const [product] =
      await sql`SELECT p.sku,p.name,p.size,i.on_hand AS "onHand",i.reserved,i.version FROM scr_product_codes c JOIN scr_products p ON p.sku=c.sku LEFT JOIN scr_inventory i ON i.sku=p.sku AND i.location=${location} WHERE c.code=${code}`;
    return { code, product: product || null };
  }
  if (body.action === "link-code" || body.action === "unlink-code") {
    const sku = text(body.sku, "SKU", 80);
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"code:" + code},0))`;
      const [existing] =
        await tx`SELECT sku FROM scr_product_codes WHERE code=${code}`;
      if (body.action === "unlink-code") {
        if (!existing || existing.sku !== sku)
          throw new StoreError("The code match changed. Scan again.", 409);
        await tx`DELETE FROM scr_product_codes WHERE code=${code}`;
      } else {
        if (existing && existing.sku !== sku)
          throw new StoreError(
            "This label is already linked to another product. Remove that match before correcting it.",
            409,
          );
        const [product] =
          await tx`SELECT sku FROM scr_products WHERE sku=${sku}`;
        if (!product)
          throw new StoreError("Choose an existing SCR product.", 404);
        await tx`INSERT INTO scr_product_codes (code,sku) VALUES (${code},${sku}) ON CONFLICT (code) DO NOTHING`;
      }
      await tx`INSERT INTO scr_audit (actor_id,action,details) VALUES (${user.id},${body.action},${tx.json({ code, sku })})`;
    });
    return { saved: true };
  }
  const sku = text(body.sku, "SKU", 80),
    requestId = text(body.requestId, "movement request ID", 80);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  )
    throw new StoreError("Enter a valid movement request ID.");
  const qty = integer(body.qty, "quantity", 1),
    note = text(body.note ?? "", "note", 500, false);
  if (!["in", "out"].includes(body.direction))
    throw new StoreError("Choose stock in or stock out.");
  const reasons =
    body.direction === "in"
      ? ["received", "return", "correction"]
      : ["counter_sale", "damage", "correction"];
  if (!reasons.includes(body.reason))
    throw new StoreError("Choose a stock movement reason.");
  const delta = body.direction === "in" ? qty : -qty;
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"move:" + requestId},0))`;
    const [previous] =
      await tx`SELECT * FROM scr_stock_moves WHERE request_id=${requestId}`;
    if (previous) {
      if (
        previous.actor_id !== user.id ||
        previous.sku !== sku ||
        previous.code !== code ||
        previous.location !== location ||
        previous.delta !== delta ||
        previous.reason !== body.reason ||
        previous.note !== note
      )
        throw new StoreError(
          "This request was already used for a different stock movement.",
          409,
        );
      return { saved: true, requestId, replayed: true };
    }
    // Hold the code match until the movement commits; a correction cannot race it.
    const [match] =
      await tx`SELECT sku FROM scr_product_codes WHERE code=${code} FOR SHARE`;
    if (match?.sku !== sku)
      throw new StoreError("The code match changed. Scan again.", 409);
    const [stock] =
      await tx`SELECT * FROM scr_inventory WHERE location=${location} AND sku=${sku} FOR UPDATE`;
    if (!stock)
      throw new StoreError(
        "Add this product's stock at this store first.",
        409,
      );
    if (stock.version !== body.expectedVersion)
      throw new StoreError("Stock changed. Scan again before confirming.", 409);
    const next = stock.on_hand + delta;
    if (!Number.isSafeInteger(next) || next > 1000000 || next < stock.reserved)
      throw new StoreError(
        "This movement would remove reserved stock or exceed the supported count. No changes were saved.",
        409,
      );
    await tx`UPDATE scr_inventory SET on_hand=${next},version=version+1 WHERE location=${location} AND sku=${sku}`;
    await tx`INSERT INTO scr_stock_moves (request_id,actor_id,code,sku,location,delta,reason,note) VALUES (${requestId},${user.id},${code},${sku},${location},${delta},${body.reason},${note})`;
    await tx`INSERT INTO scr_audit (actor_id,action,details) VALUES (${user.id},'stock_moved',${tx.json({ requestId, sku, location, delta, reason: body.reason })})`;
    return { saved: true, requestId, onHand: next };
  });
}
