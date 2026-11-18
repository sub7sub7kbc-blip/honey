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

// Delivery rule (mirrors api/server.js): Rs 250, free once the subtotal
// reaches the free-above threshold. Reads the same Admin settings
// (defaults 250 / 5000), so cart, checkout and WhatsApp orders all show
// the same final total the server will charge.
export function deliveryFor(subtotal, settings) {
  const fee = parseInt(settings?.delivery_fee || '250', 10);
  const freeAbove = parseInt(settings?.free_above || '5000', 10);
  return subtotal >= freeAbove ? 0 : fee;
}

// Real post office (GPO / head-office) codes for Pakistani cities and towns.
// Used ONLY as a last resort when the map detector (Nominatim) returns no
// postcode for the selected place — e.g. Murree (47150), which Nominatim
// does not carry. Nominatim's own postcode always wins. Never used when the
// customer merely types a city name; the code only appears after a place is
// actually selected on the map.
export const PK_CITY_POSTCODES = {
  lahore: '54000', karachi: '74000', islamabad: '44000', rawalpindi: '46000',
  faisalabad: '38000', multan: '60000', gujranwala: '52250', peshawar: '25000',
  quetta: '87300', sialkot: '51310', bahawalpur: '63100', sargodha: '40100',
  hyderabad: '71000', abbottabad: '22010', murree: '47150', jhelum: '49600',
  gujrat: '50700', sahiwal: '57000', okara: '56300', kasur: '55150',
  sheikhupura: '39350', mardan: '23200', sukkur: '65200', larkana: '77150',
  mirpur: '10250', muzaffarabad: '13100', gilgit: '15100', skardu: '16100',
  attock: '43600', chakwal: '48800', narowal: '51600', hafizabad: '52110',
  jhang: '35200', vehari: '61100', khanewal: '65190', toba: '36000',
  chiniot: '35400', khushab: '41000', mianwali: '42200', bhakkar: '42300',
  layyah: '31200', muzaffargarh: '34200', jacobabad: '79000', shikarpur: '78100',
  khairpur: '66020', dadu: '76200', badin: '72200', thatta: '73130',
  gwadar: '91200', turbat: '91300', khuzdar: '89100', loralai: '85000',
  zhob: '85200', chaman: '86000', nowshera: '24100', charsadda: '24420',
  swabi: '23300', haripur: '22620', mansehra: '21300',
};
