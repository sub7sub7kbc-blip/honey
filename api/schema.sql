-- GoldenHive schema (Neon PostgreSQL compatible).
-- Migrations run on API boot: CREATE TABLE IF NOT EXISTS + guarded seed.
-- Products are seeded with NULL prices ("Price coming soon") and empty
-- payment settings: this is the REAL system, no demo data, no demo orders.

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  price_pkr INTEGER,
  compare_at_pkr INTEGER,
  photo TEXT,
  badge TEXT,
  description TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 100,
  display_order INTEGER NOT NULL DEFAULT 0,
  accent TEXT DEFAULT '#b5772e',
  blossom_label TEXT DEFAULT '',
  tagline TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  city TEXT DEFAULT '',
  address TEXT NOT NULL,
  postcode TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  note TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  total_pkr INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT DEFAULT '',
  paid_from TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'placed',
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  custom_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_photos (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Seed: 13 products, prices NULL (owner sets them in Admin Panel).
-- Seed settings (real system: payment numbers empty, owner fills them in Admin).
INSERT INTO settings (key, value) VALUES
  ('shop_name','GoldenHive'),
  ('tagline','100% Pure Honey'),
  ('announcement','100% Pure Honey — Lab Tested — Cash on Delivery available'),
  ('whatsapp_number',''),
  ('easypaisa_number',''),
  ('easypaisa_title',''),
  ('jazzcash_number',''),
  ('jazzcash_title',''),
  ('bank_details',''),
  ('delivery_fee','250'),
  ('free_above','5000'),
  ('slider_enabled','true'),
  ('slider_speed_ms','4200'),
  ('shop_heading','Pure honey, from hive to your home'),
  ('story_text','GoldenHive brings raw, lab-tested honey from trusted beekeepers. No added sugar, no mixing — just pure honey.'),
  ('story_points','["100% Pure","Lab Tested","No Added Sugar","Cash on Delivery"]'),
  ('footer_text','GoldenHive — 100% pure honey, delivered across Pakistan.'),
  ('slide_taglines','{"sidr":"Dark amber. Rich and deep.","acacia":"Light golden. Mild and clear.","multiflora":"Wild flowers in every spoon.","sarson":"Golden, from mustard fields.","comb":"Raw. Unprocessed. Lab tested."}')
ON CONFLICT (key) DO NOTHING;
