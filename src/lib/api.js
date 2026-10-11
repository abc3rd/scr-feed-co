import { base44 } from "@/api/base44Client";
export const STORES = ["LaBelle", "Fort Myers"];
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function request(action, input = {}) {
  try {
    const response = await base44.functions.invoke("store-api", {
      ...input,
      action,
    });
    return response.data;
  } catch (error) {
    throw new ApiError(
      error.response?.data?.error ||
        error.message ||
        "The store is unavailable. Try again.",
      error.response?.status || error.status,
    );
  }
}
export const api = {
  getMe: () => request("me"),
  updateMe: (profile) => request("update-me", profile),
  getDashboard: (location) => request("dashboard", { location }),
  getOrders: () => request("orders"),
  getOrder: (orderId) => request("order", { orderId }),
  findOrder: (idempotencyKey) => request("find-order", { idempotencyKey }),
  placeOrder: (order) => request("place-order", order),
  updateOrder: (update) => request("update-order", update),
  deleteAccount: () => request("delete-profile"),
  optIn: (input) => request("consent", input),
  getConsent: () => request("get-consent"),
  getMemberByQr: (token) => request("member-qr", { token }),
  getMyQr: () => request("my-qr"),
  favorite: (sku, favorite) => request("favorite", { sku, favorite }),
  getStaffOrders: (location) => request("staff", { location }),
  getInventory: (location) => request("inventory", { location }),
  saveProduct: (product) => request("save-product", product),
  initializeStore: () => request("initialize"),
  getAudit: () => request("audit"),
  saveInbound: (shipment) => request("save-inbound", shipment),
  arriveInbound: (id) => request("arrive-inbound", { id }),
  lookupCode: (code, location) => request("lookup-code", { code, location }),
  linkCode: (code, sku, location) => request("link-code", { code, sku, location }),
  unlinkCode: (code, sku, location) => request("unlink-code", { code, sku, location }),
  moveStock: (movement) => request("move-stock", movement),
  getStockMoves: (location) => request("stock-moves", { location }),
};
