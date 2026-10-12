import { base44 } from '@/api/base44Client';

export const STORES = ['LaBelle', 'Fort Myers'];
let authLostHandler = null;
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export const onAuthLost = (fn) => { authLostHandler = fn; };
export function clearSession() {
  for (const key of ['scr_refresh_token', 'scr_mock_profile', 'scr_mock_optin']) localStorage.removeItem(key);
  sessionStorage.removeItem('scr_carts');
  base44.auth.logout(new URL('/login', window.location.origin).href);
}
async function invoke(action, input = {}) {
  try {
    const result = await base44.functions.invoke('customerApi', { action, input });
    if (!result.data || typeof result.data !== 'object') throw new ApiError('The store returned an invalid response.', 502);
    return result.data;
  } catch (error) {
    const status = error.response?.status || error.status || 503;
    if (status === 401) authLostHandler?.();
    throw new ApiError(error.response?.data?.error || 'The store service is unavailable. Please try again.', status);
  }
}
export const api = {
  getMe: () => invoke('me'),
  updateMe: (profile) => invoke('updateProfile', profile),
  getDashboard: (location) => invoke('dashboard', { location }),
  getOrder: (id) => invoke('order', { id }),
  getYard: () => invoke('yard'),
  placeHold: (order) => invoke('checkout', order),
  deleteAccount: () => invoke('deleteAccount', { confirm: true }),
  optIn: (data) => invoke('saveConsent', data),
  getMemberByQr: (token) => invoke('member', { token }),
  getMyQr: () => invoke('myQr'),
};
