// Empty operational schema. No demo customers, products, or orders.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS scr_customers (
  user_id text PRIMARY KEY,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  preferred_store text NOT NULL DEFAULT 'LaBelle',
  qr_token text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scr_deleted_users (user_id text PRIMARY KEY, requested_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS scr_products (
  sku text PRIMARY KEY,
  name text NOT NULL,
  size text NOT NULL DEFAULT '',
  category text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  catalog_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scr_inventory (
  location text NOT NULL,
  sku text NOT NULL REFERENCES scr_products(sku),
  on_hand integer NOT NULL CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= on_hand),
  reorder_threshold integer NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
  version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (location, sku)
);
CREATE TABLE IF NOT EXISTS scr_orders (
  id text PRIMARY KEY,
  customer_id text REFERENCES scr_customers(user_id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  request_body jsonb NOT NULL,
  location text NOT NULL,
  fulfillment text NOT NULL CHECK (fulfillment IN ('pickup','delivery')),
  fulfillment_date date NOT NULL,
  delivery_address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending Ticket' CHECK (status IN ('Pending Ticket','Picking','Ready','Done','Cancelled')),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  final_cents integer CHECK (final_cents >= 0),
  payment_method text NOT NULL DEFAULT 'pay_at_pickup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS scr_orders_customer_created ON scr_orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scr_orders_location_status ON scr_orders (location, status);
CREATE TABLE IF NOT EXISTS scr_order_lines (
  order_id text NOT NULL REFERENCES scr_orders(id),
  sku text NOT NULL REFERENCES scr_products(sku),
  name text NOT NULL,
  size text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  PRIMARY KEY (order_id, sku)
);
CREATE TABLE IF NOT EXISTS scr_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scr_consent (
  user_id text PRIMARY KEY REFERENCES scr_customers(user_id) ON DELETE CASCADE,
  sms_consent boolean NOT NULL DEFAULT false,
  email_consent boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  disclosure_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scr_favorites (
  user_id text NOT NULL REFERENCES scr_customers(user_id) ON DELETE CASCADE,
  sku text NOT NULL REFERENCES scr_products(sku),
  PRIMARY KEY (user_id, sku)
);
CREATE TABLE IF NOT EXISTS scr_inbound (
  id text PRIMARY KEY,
  location text NOT NULL,
  supplier text NOT NULL,
  eta date NOT NULL,
  note text NOT NULL DEFAULT '',
  arrived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;
