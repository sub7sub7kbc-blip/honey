// API client. VITE_API_URL is the API base URL (Render: https://<api>.onrender.com).
// Empty = same origin (local dev uses the Vite proxy to localhost:3001).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const api = {
  getShop: () => call('/api/v1/shop'),
  placeOrder: (body) => call('/api/v1/orders', { method: 'POST', body: JSON.stringify(body) }),
  placeCustomOrder: (body) => call('/api/v1/custom-orders', { method: 'POST', body: JSON.stringify(body) }),
  track: (q) => call('/api/v1/track?q=' + encodeURIComponent(q)),
  signup: (b) => call('/api/v1/customers/signup', { method: 'POST', body: JSON.stringify(b) }),
  login: (b) => call('/api/v1/customers/login', { method: 'POST', body: JSON.stringify(b) }),
  me: (t) => call('/api/v1/customers/me', { headers: { Authorization: 'Bearer ' + t } }),
  myOrders: (t) => call('/api/v1/customers/my-orders', { headers: { Authorization: 'Bearer ' + t } }),
  updateProfile: (t, b) => call('/api/v1/customers/profile', { method: 'PUT', headers: { Authorization: 'Bearer ' + t }, body: JSON.stringify(b) }),
  changePassword: (t, b) => call('/api/v1/customers/change-password', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: JSON.stringify(b) }),
  adminSetPin: (b) => call('/api/v1/admin/set-pin', { method: 'POST', body: JSON.stringify(b) }),
  adminLogin: (b) => call('/api/v1/admin/login', { method: 'POST', body: JSON.stringify(b) }),
  adminLogout: (t) => call('/api/v1/admin/logout', { method: 'POST', headers: { 'x-admin-token': t }, body: JSON.stringify({ token: t }) }),
  adminOrders: (t, q = '') => call('/api/v1/admin/orders' + q, { headers: { 'x-admin-token': t } }),
  adminCustomers: (t) => call('/api/v1/admin/customers', { headers: { 'x-admin-token': t } }),
  adminSetOrderStatus: (t, code, status) => call(`/api/v1/admin/orders/${code}/status`, { method: 'PUT', headers: { 'x-admin-token': t }, body: JSON.stringify({ status }) }),
  adminSetPayment: (t, code, paymentStatus) => call(`/api/v1/admin/orders/${code}/payment`, { method: 'PUT', headers: { 'x-admin-token': t }, body: JSON.stringify({ paymentStatus }) }),
  adminSaveProduct: (t, p) => call('/api/v1/admin/products', { method: 'POST', headers: { 'x-admin-token': t }, body: JSON.stringify(p) }),
  adminUpdateProduct: (t, id, p) => call(`/api/v1/admin/products/${id}`, { method: 'PUT', headers: { 'x-admin-token': t }, body: JSON.stringify(p) }),
  adminDeleteProduct: (t, id) => call(`/api/v1/admin/products/${id}`, { method: 'DELETE', headers: { 'x-admin-token': t } }),
  adminUploadPhoto: (t, id, dataUrl) => call(`/api/v1/admin/products/${id}/photo`, { method: 'POST', headers: { 'x-admin-token': t }, body: JSON.stringify({ dataUrl }) }),
  adminSaveSettings: (t, s) => call('/api/v1/admin/settings', { method: 'PUT', headers: { 'x-admin-token': t }, body: JSON.stringify(s) }),
};

export function resolvePhoto(src) {
  if (!src) return '';
  if (src.startsWith('/api/')) return BASE + src;
  return src;
}
export const fmt = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-PK');
