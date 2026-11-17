// Smoke test: boots the API against an in-memory Postgres (pg-mem) and
// exercises the full flow end to end. No real database needed.
// Run:  cd api && npm install && npm run test:smoke
// Uses test PIN 2468 and test customer 03001234567 — test-only, never shipped.
const { spawn } = require('child_process');

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}
async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const child = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PG_MEM: '1', PORT: String(PORT), JWT_SECRET: 'smoke-test-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write('[api] ' + d));
  child.stderr.on('data', (d) => process.stdout.write('[api:err] ' + d));
  try {
    let health = null;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      try { health = await call('/api/v1/health'); if (health.status === 200) break; } catch { /* retry */ }
    }
    check('health returns ok/db up', health?.data?.status === 'ok' && health?.data?.db === 'up', JSON.stringify(health?.data));

    const shop = await call('/api/v1/shop');
    check('shop loads 13 products', shop.data?.products?.length === 13, `got ${shop.data?.products?.length}`);
    check('prices seeded null (Price coming soon)', shop.data?.products?.every((p) => p.pricePkr === null));
    check('WhatsApp/payment settings empty (real system)', shop.data?.settings?.whatsapp_number === '' && shop.data?.settings?.easypaisa_number === '');
    check('delivery fee 250 / free above 5000', shop.data?.settings?.delivery_fee === '250' && shop.data?.settings?.free_above === '5000');

    // Admin: first-use PIN setup, wrong PIN rejected, right PIN logs in.
    const setPin = await call('/api/v1/admin/set-pin', { method: 'POST', body: JSON.stringify({ newPin: '2468' }) });
    check('admin PIN set on first use', setPin.data?.ok === true, JSON.stringify(setPin.data));
    const wrongPin = await call('/api/v1/admin/login', { method: 'POST', body: JSON.stringify({ pin: '0000' }) });
    check('wrong admin PIN rejected', wrongPin.status === 401);
    const login = await call('/api/v1/admin/login', { method: 'POST', body: JSON.stringify({ pin: '2468' }) });
    check('admin login succeeds', login.data?.ok === true && !!login.data?.token);
    const adminToken = login.data.token;
    const noToken = await call('/api/v1/admin/orders');
    check('admin orders without token refused', noToken.status === 401 && noToken.data?.authorized === false);
    const orders0 = await call('/api/v1/admin/orders', { headers: { 'x-admin-token': adminToken } });
    check('admin orders with token, empty list', orders0.data?.authorized === true && orders0.data?.orders?.length === 0);

    // Price a product so it can be ordered (owner would do this in Admin).
    const sidr500 = shop.data.products.find((p) => p.type === 'sidr' && p.size === '500g');
    const priced = await call(`/api/v1/admin/products/${sidr500.id}`, {
      method: 'PUT', headers: { 'x-admin-token': adminToken },
      body: JSON.stringify({ ...sidr500, pricePkr: 2750, compareAtPkr: 3200 }),
    });
    check('admin can set product price', priced.data?.product?.pricePkr === 2750);

    // Customer signup + login.
    const signup = await call('/api/v1/customers/signup', { method: 'POST', body: JSON.stringify({ name: 'Test Customer', phone: '03001234567', password: 'testpass1', city: 'Lahore', address: 'Test Street 1' }) });
    check('customer signup works', signup.data?.ok === true && !!signup.data?.token, JSON.stringify(signup.data).slice(0, 120));
    const badLogin = await call('/api/v1/customers/login', { method: 'POST', body: JSON.stringify({ phone: '03001234567', password: 'wrongpass' }) });
    check('wrong customer password rejected', badLogin.status === 401);
    const clogin = await call('/api/v1/customers/login', { method: 'POST', body: JSON.stringify({ phone: '03001234567', password: 'testpass1' }) });
    check('customer login works', clogin.data?.ok === true);
    const custToken = clogin.data.token;

    // Prepaid order without TID must fail; COD order must succeed.
    const noTid = await call('/api/v1/orders', { method: 'POST', body: JSON.stringify({
      items: [{ productId: sidr500.id, qty: 1 }], customerName: 'Test Customer', phone: '03001234567',
      address: 'Test Street 1', paymentMethod: 'easypaisa', transactionId: '', paidFrom: '' }) });
    check('prepaid order without TID rejected', noTid.status === 400);
    const order = await call('/api/v1/orders', { method: 'POST', body: JSON.stringify({
      items: [{ productId: sidr500.id, qty: 1 }], customerName: 'Test Customer', phone: '03001234567',
      address: 'Test Street 1', paymentMethod: 'cod', customerId: signup.data.customer.id }) });
    check('COD order placed, GH code, payment pending', order.data?.order?.code === 'GH-00001' && order.data?.order?.paymentStatus === 'pending', JSON.stringify(order.data?.order?.code));
    check('order total = 2750 + 250 delivery', order.data?.order?.totalPkr === 3000, `got ${order.data?.order?.totalPkr}`);

    // Track by phone (03xx) and by code.
    const byPhone = await call('/api/v1/track?q=03001234567');
    check('track by phone finds order', byPhone.data?.orders?.length === 1);
    const byCode = await call('/api/v1/track?q=GH-00001');
    check('track by GH code finds order + timeline', byCode.data?.orders?.[0]?.timeline?.length >= 1);

    // Custom order estimate (Sidr 750g at 2750/500g = 5.5/g -> 4125 -> rounded 4130).
    const custom = await call('/api/v1/custom-orders', { method: 'POST', body: JSON.stringify({
      honeyType: 'sidr', grams: 750, jar: 'glass', packaging: 'gift', purpose: 'gift', giftNote: 'Happy day',
      customerName: 'Test Customer', phone: '03001234567', address: 'Test Street 1', paymentMethod: 'cod' }) });
    check('custom order placed with server estimate', custom.data?.ok === true && custom.data?.estimate === 4130, JSON.stringify(custom.data?.estimate));

    // My Orders links the guest/COD order to the account.
    const mine = await call('/api/v1/customers/my-orders', { headers: { Authorization: 'Bearer ' + custToken } });
    check('My Orders shows linked orders', mine.data?.orders?.length >= 1, `got ${mine.data?.orders?.length}`);

    // Admin: mark paid + ship, then customers aggregate.
    const paid = await call('/api/v1/admin/orders/GH-00001/payment', { method: 'PUT', headers: { 'x-admin-token': adminToken }, body: JSON.stringify({ paymentStatus: 'paid' }) });
    check('admin can mark payment Paid', paid.data?.order?.paymentStatus === 'paid');
    const shipped = await call('/api/v1/admin/orders/GH-00001/status', { method: 'PUT', headers: { 'x-admin-token': adminToken }, body: JSON.stringify({ status: 'shipped' }) });
    check('admin can change order status', shipped.data?.order?.status === 'shipped');
    const custs = await call('/api/v1/admin/customers', { headers: { 'x-admin-token': adminToken } });
    check('admin customers aggregate (Rs 3000+ spent)', custs.data?.customers?.[0]?.total_spent >= 3000, JSON.stringify(custs.data?.customers?.[0]));

    // Settings round-trip + admin logout.
    const saved = await call('/api/v1/admin/settings', { method: 'PUT', headers: { 'x-admin-token': adminToken }, body: JSON.stringify({ whatsapp_number: '03009998888', delivery_fee: '200' }) });
    check('admin can save settings', saved.data?.settings?.whatsapp_number === '03009998888');
    await call('/api/v1/admin/logout', { method: 'POST', headers: { 'x-admin-token': adminToken }, body: JSON.stringify({ token: adminToken }) });
    const afterLogout = await call('/api/v1/admin/orders', { headers: { 'x-admin-token': adminToken } });
    check('admin token invalid after logout', afterLogout.status === 401);
  } finally {
    child.kill();
  }
  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} SMOKE TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
