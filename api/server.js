// GoldenHive API — Node + Express + PostgreSQL (Neon compatible).
// Env: DATABASE_URL, JWT_SECRET, PORT. Migrations + seed run on boot.
// Health: GET /api/v1/health -> {"status":"ok","db":"up"|"down"}
// Photos uploaded by admin are stored in the DB (bytea), never on local
// disk (Render free disk is wiped on every redeploy).
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const PAYMENT_METHODS = ['cod', 'easypaisa', 'jazzcash', 'bank'];
const ORDER_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

let pool = null;
let dbUp = false;

function createPool() {
  if (process.env.PG_MEM === '1') {
    // In-memory Postgres (pg-mem) — local smoke tests only, never production.
    const { newDb } = require('pg-mem');
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    return new Pool();
  }
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = require('pg');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') || process.env.PGSSL === '1'
      ? { rejectUnauthorized: false } : undefined,
  });
}

async function migrate() {
  if (!pool) return;
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  // Seed products once, only when the table is empty (keeps reboots idempotent
  // and avoids INSERT...SELECT WHERE NOT EXISTS, which pg-mem cannot run).
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM products');
  if (parseInt(rows[0].n, 10) === 0) {
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seed);
  }
  // Photo fix (2026-11-17 audit): the original seed used a watermelon photo for
  // Sidr, seedlings for Sarson and a 404 Unsplash URL for Raw Honeycomb.
  // Correct any seeded rows still pointing at those URLs (idempotent).
  await pool.query(`UPDATE products SET photo=$1 WHERE photo LIKE '%photo-1587049352846-4a222e784d38%'`,
    ['https://images.pexels.com/photos/8805026/pexels-photo-8805026.jpeg?auto=compress&cs=tinysrgb&w=1200']);
  await pool.query(`UPDATE products SET photo=$1 WHERE photo LIKE '%photo-1466692476868-aef1dfb1e735%'`,
    ['https://images.pexels.com/photos/30027910/pexels-photo-30027910.jpeg?auto=compress&cs=tinysrgb&w=1200']);
  await pool.query(`UPDATE products SET photo=$1 WHERE photo LIKE '%photo-1587049352851-8d4e89134724%'`,
    ['https://images.pexels.com/photos/3424406/pexels-photo-3424406.jpeg?auto=compress&cs=tinysrgb&w=1200']);
  dbUp = true;
}

async function getSettings() {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}
async function setSetting(key, value) {
  await pool.query(
    'INSERT INTO settings(key, value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, String(value ?? '')]);
}
function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return '92' + d.slice(1);
  if (d.length === 10 && d.startsWith('3')) return '92' + d;
  return d;
}
function hashToken(t) { return crypto.createHash('sha256').update(t).digest('hex'); }
function publicProduct(p) {
  return { id: p.id, name: p.name, type: p.type, size: p.size, pricePkr: p.price_pkr,
    compareAtPkr: p.compare_at_pkr, photo: p.photo, badge: p.badge,
    description: p.description, stock: p.stock, displayOrder: p.display_order,
    accent: p.accent, blossomLabel: p.blossom_label, tagline: p.tagline };
}
function publicOrder(o) {
  return { id: o.id, code: o.code, customerName: o.customer_name, phone: o.phone,
    city: o.city, address: o.address, note: o.note, items: o.items,
    totalPkr: o.total_pkr, deliveryFee: o.delivery_fee,
    paymentMethod: o.payment_method, paymentStatus: o.payment_status,
    transactionId: o.transaction_id, paidFrom: o.paid_from, status: o.status,
    isCustom: o.is_custom, customDetails: o.custom_details, createdAt: o.created_at };
}
function requireDb(req, res, next) {
  if (!pool || !dbUp) return res.status(503).json({ error: 'Database not connected. Set DATABASE_URL.' });
  next();
}
async function requireAdmin(req, res, next) {
  if (!pool) return res.status(503).json({ error: 'Database not connected.' });
  const token = req.headers['x-admin-token'] || '';
  if (!token) return res.status(401).json({ authorized: false, error: 'Admin login required.' });
  const { rows } = await pool.query(
    'SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND expires_at > now()', [hashToken(token)]);
  if (!rows.length) return res.status(401).json({ authorized: false, error: 'Admin session expired. Login again.' });
  next();
}
async function customerFromToken(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM customers WHERE id=$1', [payload.id]);
    return rows[0] || null;
  } catch { return null; }
}

// ---- Admin PIN helpers (salted scrypt hash, stored in settings) ----
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPin(pin, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(pin, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/v1/health', async (req, res) => {
  let db = 'down';
  if (pool) {
    try { await pool.query('SELECT 1'); db = 'up'; } catch { db = 'down'; }
  }
  res.json({ status: 'ok', db });
});

// ---- Shop (public) ----
app.get('/api/v1/products', requireDb, async (req, res) => {
  const { rows: products } = await pool.query('SELECT * FROM products ORDER BY display_order ASC, id ASC');
  res.json({ products: products.map(publicProduct) });
});

app.get('/api/v1/shop', requireDb, async (req, res) => {
  const { rows: products } = await pool.query('SELECT * FROM products ORDER BY display_order ASC, id ASC');
  const s = await getSettings();
  const pub = { ...s };
  delete pub.admin_pin_hash; delete pub.admin_failed_attempts; delete pub.admin_lock_until;
  res.json({ products: products.map(publicProduct), settings: pub });
});

app.get('/api/v1/photos/:id', requireDb, async (req, res) => {
  const { rows } = await pool.query('SELECT mime, data FROM product_photos WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Photo not found.' });
  res.set('Content-Type', rows[0].mime).send(rows[0].data);
});

// ---- Orders ----
async function createOrderRecord(data) {
  const { rows } = await pool.query(
    `INSERT INTO orders (customer_id, customer_name, phone, phone_normalized, city, address, note,
       items, total_pkr, delivery_fee, payment_method, payment_status, transaction_id, paid_from,
       status, is_custom, custom_details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13,'placed',$14,$15) RETURNING *`,
    [data.customerId || null, data.customerName, data.phone, data.phoneNormalized, data.city || '',
     data.address, data.note || '', JSON.stringify(data.items), data.totalPkr, data.deliveryFee,
     data.paymentMethod, data.transactionId || '', data.paidFrom || '', !!data.isCustom,
     data.customDetails ? JSON.stringify(data.customDetails) : null]);
  const order = rows[0];
  const code = 'GH-' + String(order.id).padStart(5, '0');
  const upd = await pool.query('UPDATE orders SET code=$1 WHERE id=$2 RETURNING *', [code, order.id]);
  await pool.query('INSERT INTO order_events(order_id, status, note) VALUES($1,$2,$3)',
    [order.id, 'placed', 'Order placed']);
  return upd.rows[0];
}

app.post('/api/v1/orders', requireDb, async (req, res) => {
  const { items, customerName, phone, city, address, note, paymentMethod, transactionId, paidFrom, customerId } = req.body || {};
  if (!customerName || !phone || !address) return res.status(400).json({ error: 'Name, mobile number and address are required.' });
  if (!PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method.' });
  if (paymentMethod !== 'cod') {
    if (!transactionId || String(transactionId).length < 4) return res.status(400).json({ error: 'Transaction ID (at least 4 characters) is required for prepaid orders.' });
    if (!paidFrom || String(paidFrom).replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Paid-from number (at least 10 digits) is required for prepaid orders.' });
  }
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty.' });
  const s = await getSettings();
  const deliveryFee = parseInt(s.delivery_fee || '250', 10);
  const freeAbove = parseInt(s.free_above || '5000', 10);
  let total = 0; const savedItems = [];
  for (const it of items) {
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [it.productId]);
    if (!rows.length) return res.status(400).json({ error: 'A product in the cart no longer exists.' });
    const p = rows[0];
    if (p.price_pkr == null) return res.status(400).json({ error: `"${p.name} ${p.size}" price is coming soon — it cannot be ordered yet.` });
    const qty = Math.max(1, Math.min(99, parseInt(it.qty || 1, 10)));
    total += p.price_pkr * qty;
    savedItems.push({ productId: p.id, name: p.name, size: p.size, pricePkr: p.price_pkr, qty });
  }
  const fee = total >= freeAbove ? 0 : deliveryFee;
  const order = await createOrderRecord({
    customerId, customerName, phone, phoneNormalized: normalizePhone(phone), city, address, note,
    items: savedItems, totalPkr: total + fee, deliveryFee: fee, paymentMethod, transactionId, paidFrom });
  res.json({ ok: true, order: publicOrder(order) });
});

app.post('/api/v1/custom-orders', requireDb, async (req, res) => {
  const { honeyType, grams, jar, packaging, purpose, giftNote, note, customerName, phone, city, address, paymentMethod, transactionId, paidFrom, customerId } = req.body || {};
  const g = parseInt(grams, 10);
  if (!honeyType || !g || g < 100 || g > 5000) return res.status(400).json({ error: 'Custom order: choose a honey type and 100g–5kg.' });
  if (!customerName || !phone || !address) return res.status(400).json({ error: 'Name, mobile number and address are required.' });
  if (!PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method.' });
  if (paymentMethod !== 'cod') {
    if (!transactionId || String(transactionId).length < 4) return res.status(400).json({ error: 'Transaction ID (at least 4 characters) is required for prepaid orders.' });
    if (!paidFrom || String(paidFrom).replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Paid-from number (at least 10 digits) is required for prepaid orders.' });
  }
  // Price estimate: best per-gram rate among priced products of this type.
  const { rows } = await pool.query(
    "SELECT price_pkr, size FROM products WHERE type=$1 AND price_pkr IS NOT NULL", [honeyType]);
  if (!rows.length) return res.status(400).json({ error: 'This honey has no price yet — price is coming soon.' });
  const gramsOf = (size) => (size === '1kg' ? 1000 : size === '500g' ? 500 : size === '250g' ? 250 : 400);
  const rate = Math.min(...rows.map(r => r.price_pkr / gramsOf(r.size)));
  const estimate = Math.round(rate * g / 10) * 10;
  const s = await getSettings();
  const deliveryFee = parseInt(s.delivery_fee || '250', 10);
  const freeAbove = parseInt(s.free_above || '5000', 10);
  const fee = estimate >= freeAbove ? 0 : deliveryFee;
  const customDetails = { honeyType, grams: g, jar: jar || 'glass', packaging: packaging || 'standard', purpose: purpose || 'home', giftNote: giftNote || '' };
  const label = `${honeyType} Honey — Custom ${g}g (${jar || 'glass'} jar)`;
  const order = await createOrderRecord({
    customerId, customerName, phone, phoneNormalized: normalizePhone(phone), city, address, note,
    items: [{ productId: null, name: label, size: `${g}g`, pricePkr: estimate, qty: 1 }],
    totalPkr: estimate + fee, deliveryFee: fee, paymentMethod, transactionId, paidFrom,
    isCustom: true, customDetails });
  res.json({ ok: true, order: publicOrder(order), estimate });
});

app.get('/api/v1/track', requireDb, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ orders: [] });
  let rows;
  if (/^GH-/i.test(q)) {
    ({ rows } = await pool.query('SELECT * FROM orders WHERE UPPER(code)=UPPER($1) ORDER BY created_at DESC', [q]));
  } else {
    ({ rows } = await pool.query('SELECT * FROM orders WHERE phone_normalized=$1 ORDER BY created_at DESC', [normalizePhone(q)]));
  }
  const orders = rows.map(publicOrder);
  for (const o of orders) {
    const ev = await pool.query('SELECT status, note, created_at FROM order_events WHERE order_id=$1 ORDER BY created_at ASC', [o.id]);
    o.timeline = ev.rows;
  }
  res.json({ orders });
});

// ---- Customers ----
app.post('/api/v1/customers/signup', requireDb, async (req, res) => {
  const { name, phone, password, city, address } = req.body || {};
  if (!name || !phone || !password || String(password).length < 6)
    return res.status(400).json({ error: 'Name, mobile number and a password (at least 6 characters) are required.' });
  const pn = normalizePhone(phone);
  const existing = await pool.query('SELECT id FROM customers WHERE phone_normalized=$1', [pn]);
  if (existing.rows.length) return res.status(400).json({ error: 'An account with this mobile number already exists. Please log in.' });
  const hash = await bcrypt.hash(String(password), 10);
  const { rows } = await pool.query(
    'INSERT INTO customers(name, phone, phone_normalized, password_hash, city, address) VALUES($1,$2,$3,$4,$5,$6) RETURNING id, name, phone, city, address',
    [name, phone, pn, hash, city || '', address || '']);
  const c = rows[0];
  await pool.query('UPDATE orders SET customer_id=$1 WHERE phone_normalized=$2 AND customer_id IS NULL', [c.id, pn]);
  const token = jwt.sign({ id: c.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, customer: c, token });
});

app.post('/api/v1/customers/login', requireDb, async (req, res) => {
  const { phone, password } = req.body || {};
  const { rows } = await pool.query('SELECT * FROM customers WHERE phone_normalized=$1', [normalizePhone(phone)]);
  if (!rows.length) return res.status(401).json({ error: 'No account with this mobile number.' });
  const c = rows[0];
  if (!(await bcrypt.compare(String(password || ''), c.password_hash)))
    return res.status(401).json({ error: 'Wrong password.' });
  await pool.query('UPDATE orders SET customer_id=$1 WHERE phone_normalized=$2 AND customer_id IS NULL', [c.id, c.phone_normalized]);
  const token = jwt.sign({ id: c.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, customer: { id: c.id, name: c.name, phone: c.phone, city: c.city, address: c.address }, token });
});

app.get('/api/v1/customers/me', requireDb, async (req, res) => {
  const c = await customerFromToken(req);
  if (!c) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ customer: { id: c.id, name: c.name, phone: c.phone, city: c.city, address: c.address } });
});

app.get('/api/v1/customers/my-orders', requireDb, async (req, res) => {
  const c = await customerFromToken(req);
  if (!c) return res.status(401).json({ error: 'Not logged in.' });
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE customer_id=$1 OR phone_normalized=$2 ORDER BY created_at DESC',
    [c.id, c.phone_normalized]);
  res.json({ orders: rows.map(publicOrder) });
});

app.put('/api/v1/customers/profile', requireDb, async (req, res) => {
  const c = await customerFromToken(req);
  if (!c) return res.status(401).json({ error: 'Not logged in.' });
  const { name, city, address } = req.body || {};
  const { rows } = await pool.query(
    'UPDATE customers SET name=$1, city=$2, address=$3 WHERE id=$4 RETURNING id, name, phone, city, address',
    [name || c.name, city || '', address || '', c.id]);
  res.json({ ok: true, customer: rows[0] });
});

app.post('/api/v1/customers/change-password', requireDb, async (req, res) => {
  const c = await customerFromToken(req);
  if (!c) return res.status(401).json({ error: 'Not logged in.' });
  const { currentPassword, newPassword } = req.body || {};
  if (!(await bcrypt.compare(String(currentPassword || ''), c.password_hash)))
    return res.status(401).json({ error: 'Current password is wrong.' });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  await pool.query('UPDATE customers SET password_hash=$1 WHERE id=$2',
    [await bcrypt.hash(String(newPassword), 10), c.id]);
  res.json({ ok: true });
});

// ---- Admin ----
app.post('/api/v1/admin/set-pin', requireDb, async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  if (!/^\d{4,8}$/.test(String(newPin || ''))) return res.status(400).json({ error: 'PIN must be 4–8 digits.' });
  const s = await getSettings();
  if (s.admin_pin_hash) {
    if (!verifyPin(String(currentPin || ''), s.admin_pin_hash))
      return res.status(401).json({ error: 'Current PIN is wrong.' });
  }
  await setSetting('admin_pin_hash', hashPin(String(newPin)));
  await setSetting('admin_failed_attempts', '0');
  await setSetting('admin_lock_until', '');
  res.json({ ok: true });
});

app.post('/api/v1/admin/login', requireDb, async (req, res) => {
  const { pin } = req.body || {};
  const s = await getSettings();
  if (!s.admin_pin_hash) return res.status(400).json({ error: 'No admin PIN set yet. Set a PIN first.' });
  const lockUntil = parseInt(s.admin_lock_until || '0', 10);
  if (lockUntil && Date.now() < lockUntil)
    return res.status(429).json({ error: 'Too many wrong tries. Try again in 5 minutes.' });
  if (!verifyPin(String(pin || ''), s.admin_pin_hash)) {
    const fails = (parseInt(s.admin_failed_attempts || '0', 10) || 0) + 1;
    await setSetting('admin_failed_attempts', String(fails));
    if (fails >= 5) {
      await setSetting('admin_lock_until', String(Date.now() + 5 * 60 * 1000));
      await setSetting('admin_failed_attempts', '0');
      return res.status(429).json({ error: 'Too many wrong tries. Locked for 5 minutes.' });
    }
    return res.status(401).json({ error: 'Wrong PIN.' });
  }
  await setSetting('admin_failed_attempts', '0');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  await pool.query('INSERT INTO admin_sessions(token_hash, expires_at) VALUES($1, $2)',
    [hashToken(token), expires]);
  res.json({ ok: true, token });
});

app.post('/api/v1/admin/logout', requireDb, async (req, res) => {
  const token = req.body?.token || req.headers['x-admin-token'] || '';
  if (token) await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1', [hashToken(token)]);
  res.json({ ok: true });
});

app.get('/api/v1/admin/orders', requireDb, requireAdmin, async (req, res) => {
  const { search, status, limit } = req.query;
  const params = []; const where = [];
  if (search) { params.push(`%${search}%`); where.push(`(UPPER(code) LIKE UPPER($${params.length}) OR customer_name ILIKE $${params.length} OR phone LIKE $${params.length})`); }
  if (status && status !== 'all') { params.push(status); where.push(`status = $${params.length}`); }
  params.push(Math.min(100, parseInt(limit || '50', 10) || 50));
  const { rows } = await pool.query(
    `SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${params.length}`, params);
  res.json({ authorized: true, orders: rows.map(publicOrder) });
});

app.get('/api/v1/admin/customers', requireDb, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT phone_normalized AS phone, MAX(customer_name) AS name, COUNT(*) AS orders,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_pkr ELSE 0 END),0) AS total_spent,
            MAX(created_at) AS last_order
     FROM orders GROUP BY phone_normalized ORDER BY last_order DESC`);
  res.json({ authorized: true, customers: rows });
});

app.put('/api/v1/admin/orders/:code/status', requireDb, requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const { rows } = await pool.query('UPDATE orders SET status=$1 WHERE UPPER(code)=UPPER($2) RETURNING *', [status, req.params.code]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
  await pool.query('INSERT INTO order_events(order_id, status) VALUES($1,$2)', [rows[0].id, status]);
  res.json({ ok: true, order: publicOrder(rows[0]) });
});

app.put('/api/v1/admin/orders/:code/payment', requireDb, requireAdmin, async (req, res) => {
  const { paymentStatus } = req.body || {};
  if (!['pending', 'paid'].includes(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status.' });
  const { rows } = await pool.query('UPDATE orders SET payment_status=$1 WHERE UPPER(code)=UPPER($2) RETURNING *', [paymentStatus, req.params.code]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
  res.json({ ok: true, order: publicOrder(rows[0]) });
});

app.post('/api/v1/admin/products', requireDb, requireAdmin, async (req, res) => {
  const p = req.body || {};
  const { rows } = await pool.query(
    `INSERT INTO products(name,type,size,price_pkr,compare_at_pkr,photo,badge,description,stock,display_order,accent,blossom_label,tagline)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [p.name, p.type, p.size, p.pricePkr ?? null, p.compareAtPkr ?? null, p.photo || '', p.badge || '',
     p.description || '', p.stock ?? 100, p.displayOrder ?? 0, p.accent || '#b5772e', p.blossomLabel || '', p.tagline || '']);
  res.json({ ok: true, product: publicProduct(rows[0]) });
});

app.put('/api/v1/admin/products/:id', requireDb, requireAdmin, async (req, res) => {
  const p = req.body || {};
  const { rows } = await pool.query(
    `UPDATE products SET name=$1,type=$2,size=$3,price_pkr=$4,compare_at_pkr=$5,photo=$6,badge=$7,
       description=$8,stock=$9,display_order=$10,accent=$11,blossom_label=$12,tagline=$13 WHERE id=$14 RETURNING *`,
    [p.name, p.type, p.size, p.pricePkr ?? null, p.compareAtPkr ?? null, p.photo || '', p.badge || '',
     p.description || '', p.stock ?? 100, p.displayOrder ?? 0, p.accent || '#b5772e', p.blossomLabel || '', p.tagline || '', req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ok: true, product: publicProduct(rows[0]) });
});

app.delete('/api/v1/admin/products/:id', requireDb, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/v1/admin/products/:id/photo', requireDb, requireAdmin, async (req, res) => {
  const { dataUrl } = req.body || {};
  const m = String(dataUrl || '').match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Send an image as a data URL.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Image must be under 2 MB.' });
  const { rows } = await pool.query(
    'INSERT INTO product_photos(product_id, mime, data) VALUES($1,$2,$3) RETURNING id',
    [req.params.id, m[1], buf]);
  await pool.query('UPDATE products SET photo=$1 WHERE id=$2', [`/api/v1/photos/${rows[0].id}`, req.params.id]);
  res.json({ ok: true, photo: `/api/v1/photos/${rows[0].id}` });
});

const SETTING_KEYS = ['shop_name','tagline','announcement','whatsapp_number','easypaisa_number','easypaisa_title',
  'jazzcash_number','jazzcash_title','bank_details','delivery_fee','free_above','slider_enabled',
  'slider_speed_ms','shop_heading','story_text','story_points','footer_text','slide_taglines'];
app.put('/api/v1/admin/settings', requireDb, requireAdmin, async (req, res) => {
  for (const k of SETTING_KEYS) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) await setSetting(k, req.body[k]);
  }
  res.json({ ok: true, settings: await getSettings() });
});

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

async function start() {
  pool = createPool();
  if (pool) {
    try { await migrate(); console.log('Database connected, migrations applied.'); }
    catch (e) { console.error('Migration failed:', e.message); dbUp = false; }
  } else {
    console.log('No DATABASE_URL set — starting without a database (health will report db: down).');
  }
  app.listen(PORT, () => console.log(`GoldenHive API listening on port ${PORT}`));
}
if (require.main === module) start();
module.exports = { app, createPool, migrate };
