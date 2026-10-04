-- Gamil Minage — database schema.
-- Idempotent: safe to run many times (npm run db:migrate).
-- Rule learned from the previous project: every boolean is NOT NULL with an explicit default,
-- so a NULL can never silently drop rows out of a WHERE clause.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS admins (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username             text        NOT NULL,
  display_name         text        NOT NULL DEFAULT '',
  password_hash        text        NOT NULL,
  must_change_password boolean     NOT NULL DEFAULT false,
  is_active            boolean     NOT NULL DEFAULT true,
  token_version        integer     NOT NULL DEFAULT 0,
  last_login_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admins_username_key ON admins (lower(username));

CREATE TABLE IF NOT EXISTS categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid        REFERENCES categories(id) ON DELETE SET NULL,
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  description     text        NOT NULL DEFAULT '',
  image_public_id text,
  sort_order      integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_id);

CREATE TABLE IF NOT EXISTS products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid        REFERENCES categories(id) ON DELETE SET NULL,
  name             text        NOT NULL,
  slug             text        NOT NULL UNIQUE,
  sku              text        NOT NULL DEFAULT '',
  brand            text        NOT NULL DEFAULT '',
  description      text        NOT NULL DEFAULT '',
  price            integer     NOT NULL CHECK (price >= 0),
  compare_at_price integer     CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock            integer     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  track_stock      boolean     NOT NULL DEFAULT true,
  is_active        boolean     NOT NULL DEFAULT true,
  is_featured      boolean     NOT NULL DEFAULT false,
  sold_count       integer     NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx   ON products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx     ON products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx  ON products USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  public_id  text        NOT NULL,
  alt        text        NOT NULL DEFAULT '',
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images (product_id, sort_order);

CREATE TABLE IF NOT EXISTS banners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL DEFAULT '',
  subtitle        text        NOT NULL DEFAULT '',
  button_text     text        NOT NULL DEFAULT '',
  link_url        text        NOT NULL DEFAULT '',
  image_public_id text,
  sort_order      integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  wilaya_code smallint    PRIMARY KEY CHECK (wilaya_code BETWEEN 1 AND 69),
  wilaya_name text        NOT NULL,
  -- NULL = price not decided yet: the order is accepted and the price is confirmed by phone.
  price       integer     CHECK (price IS NULL OR price >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text        NOT NULL UNIQUE,
  status        text        NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','confirmed','shipped','delivered','cancelled','returned')),
  customer_name text        NOT NULL,
  phone         text        NOT NULL CHECK (phone ~ '^0[567][0-9]{8}$'),
  wilaya_code   smallint    NOT NULL,
  wilaya_name   text        NOT NULL,
  commune       text        NOT NULL,
  address       text        NOT NULL DEFAULT '',
  customer_note text        NOT NULL DEFAULT '',
  admin_note    text        NOT NULL DEFAULT '',
  subtotal      integer     NOT NULL CHECK (subtotal >= 0),
  shipping_fee  integer     NOT NULL CHECK (shipping_fee >= 0),
  shipping_pending boolean  NOT NULL DEFAULT false,
  total         integer     NOT NULL CHECK (total >= 0),
  ip_hash       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_idx   ON orders (phone);

CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid    REFERENCES products(id) ON DELETE SET NULL,
  product_name    text    NOT NULL,
  image_public_id text,
  unit_price      integer NOT NULL CHECK (unit_price >= 0),
  quantity        integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  line_total      integer GENERATED ALWAYS AS (unit_price * quantity) STORED
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     text        NOT NULL,
  note       text        NOT NULL DEFAULT '',
  admin_id   uuid        REFERENCES admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_history_order_idx ON order_status_history (order_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'order',
  title      text        NOT NULL,
  body       text        NOT NULL DEFAULT '',
  link       text        NOT NULL DEFAULT '',
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_idx ON notifications (is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  count        integer     NOT NULL,
  window_start timestamptz NOT NULL
);

-- ---------------------------------------------------------------- seed data
INSERT INTO settings (key, value) VALUES
  ('store_name',     'Gamil Minage'),
  ('tagline',        'أواني وأدوات منزلية بجودة وأسعار تناسبك'),
  ('phone',          '0793811891'),
  ('whatsapp',       '0793811891'),
  ('instagram',      'https://www.instagram.com/gamil_minage_39'),
  ('facebook',       ''),
  ('tiktok',         ''),
  ('address',        'وادي سوف، الجزائر'),
  ('map_url',        'https://maps.app.goo.gl/tqVivJp7tUCmLdpFA'),
  ('working_hours',  ''),
  ('announcement',   'الدفع عند الاستلام • التوصيل لجميع الولايات'),
  ('about_text',     'Gamil Minage متجر في وادي سوف لبيع أواني المطبخ والأدوات المنزلية. نختار منتجاتنا بعناية ونوصلها إلى بابك في كل ولايات الجزائر، والدفع عند الاستلام.'),
  ('seo_description','متجر Gamil Minage في وادي سوف: أواني مطبخ وأدوات منزلية وديكور، توصيل لجميع الولايات والدفع عند الاستلام.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO shipping_rates (wilaya_code, wilaya_name) VALUES
  (1,'أدرار'),(2,'الشلف'),(3,'الأغواط'),(4,'أم البواقي'),(5,'باتنة'),(6,'بجاية'),(7,'بسكرة'),(8,'بشار'),
  (9,'البليدة'),(10,'البويرة'),(11,'تمنراست'),(12,'تبسة'),(13,'تلمسان'),(14,'تيارت'),(15,'تيزي وزو'),(16,'الجزائر'),
  (17,'الجلفة'),(18,'جيجل'),(19,'سطيف'),(20,'سعيدة'),(21,'سكيكدة'),(22,'سيدي بلعباس'),(23,'عنابة'),(24,'قالمة'),
  (25,'قسنطينة'),(26,'المدية'),(27,'مستغانم'),(28,'المسيلة'),(29,'معسكر'),(30,'ورقلة'),(31,'وهران'),(32,'البيض'),
  (33,'إليزي'),(34,'برج بوعريريج'),(35,'بومرداس'),(36,'الطارف'),(37,'تندوف'),(38,'تيسمسيلت'),(39,'الوادي'),(40,'خنشلة'),
  (41,'سوق أهراس'),(42,'تيبازة'),(43,'ميلة'),(44,'عين الدفلى'),(45,'النعامة'),(46,'عين تموشنت'),(47,'غرداية'),(48,'غليزان'),
  (49,'تيميمون'),(50,'برج باجي مختار'),(51,'أولاد جلال'),(52,'بني عباس'),(53,'عين صالح'),(54,'عين قزام'),(55,'تقرت'),(56,'جانت'),
  (57,'المغير'),(58,'المنيعة'),(59,'أفلو'),(60,'بريكة'),(61,'القنطرة'),(62,'بئر العاتر'),(63,'العريشة'),(64,'قصر الشلالة'),
  (65,'عين وسارة'),(66,'مسعد'),(67,'قصر البخاري'),(68,'بوسعادة'),(69,'الأبيض سيدي الشيخ')
ON CONFLICT (wilaya_code) DO NOTHING;
