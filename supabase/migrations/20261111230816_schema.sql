-- =============================================================================
-- Mandela Heritage Furniture: core schema
-- Tables, enums, constraints, indexes and triggers.
-- RLS, functions and storage live in the following migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'
);

create type public.payment_status as enum ('unpaid', 'deposit_paid', 'paid', 'refunded');

create type public.inventory_reason as enum (
  'restock', 'sale', 'adjustment', 'return', 'cancelled_order'
);

create type public.custom_request_status as enum (
  'new', 'quoted', 'accepted', 'in_production', 'ready', 'delivered', 'declined'
);

create type public.admin_role as enum ('owner', 'staff');

-- -----------------------------------------------------------------------------
-- Shared trigger: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Kenyan phone normalisation: returns +2547XXXXXXXX / +2541XXXXXXXX or NULL.
-- Accepts 07.., 01.., 7.., 1.., 2547.., +2547.. with spaces/dashes/brackets.
-- -----------------------------------------------------------------------------
create or replace function public.normalize_ke_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[\s\-\(\)\.]', '', 'g');
begin
  if v ~ '^\+254[17][0-9]{8}$' then
    return v;
  elsif v ~ '^254[17][0-9]{8}$' then
    return '+' || v;
  elsif v ~ '^0[17][0-9]{8}$' then
    return '+254' || substr(v, 2);
  elsif v ~ '^[17][0-9]{8}$' then
    return '+254' || v;
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin users (linked to Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.admin_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Categories (two levels: category -> sub-category)
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete restrict,
  name        text not null check (length(btrim(name)) between 1 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create index categories_parent_idx on public.categories (parent_id, sort_order);

-- Enforce a maximum depth of two levels.
create or replace function public.enforce_category_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.categories c
               where c.id = new.parent_id and c.parent_id is not null) then
      raise exception using errcode = 'P0001', message = 'CATEGORY_TOO_DEEP',
        detail = 'A sub-category cannot have its own sub-categories.';
    end if;
    if exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception using errcode = 'P0001', message = 'CATEGORY_HAS_CHILDREN',
        detail = 'A category with sub-categories cannot become a sub-category.';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_depth
  before insert or update of parent_id on public.categories
  for each row execute function public.enforce_category_depth();

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(btrim(name)) between 1 and 200),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description         text,
  -- on delete restrict: a category that still has products cannot be deleted
  category_id         uuid not null references public.categories (id) on delete restrict,
  price               numeric(12,2) not null check (price > 0),           -- base / "from" price
  compare_at_price    numeric(12,2) check (compare_at_price is null or compare_at_price > 0),
  sku                 text unique,
  has_variants        boolean not null default false,
  stock_quantity      integer not null default 0 check (stock_quantity >= 0), -- only when has_variants = false
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_active           boolean not null default true,
  is_featured         boolean not null default false,
  dimensions          text,
  materials           text,
  room                text,
  colour              text,   -- used by the colour filter for simple products
  lead_time_days      integer not null default 0 check (lead_time_days >= 0),
  is_made_to_order    boolean not null default false,
  free_delivery       boolean not null default false,
  badge               text check (badge is null or length(badge) <= 30),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_active_featured_idx on public.products (is_active, is_featured);
create index products_created_idx on public.products (created_at desc);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Product images
-- -----------------------------------------------------------------------------
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url        text not null,
  alt_text   text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- -----------------------------------------------------------------------------
-- Product options (e.g. Size, Fabric, Colour, Finish)
-- -----------------------------------------------------------------------------
create table public.product_options (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 60),
  "values"   text[] not null check (cardinality("values") >= 1),
  sort_order integer not null default 0,
  unique (product_id, name)
);

create index product_options_product_idx on public.product_options (product_id, sort_order);

-- -----------------------------------------------------------------------------
-- Product variants (one row per option combination)
-- -----------------------------------------------------------------------------
create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  sku                 text unique,
  option_values       jsonb not null check (jsonb_typeof(option_values) = 'object'),
  price               numeric(12,2) check (price is null or price > 0), -- null => product price
  compare_at_price    numeric(12,2) check (compare_at_price is null or compare_at_price > 0),
  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  image_id            uuid references public.product_images (id) on delete set null,
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (product_id, option_values)
);

create index product_variants_product_idx on public.product_variants (product_id, sort_order);

create trigger product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Validate option_values against the product's options (only when they change,
-- so stock updates never fail on a variant whose option was later renamed).
create or replace function public.validate_variant_options()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  v text;
begin
  for k, v in select key, value from jsonb_each_text(new.option_values) loop
    if not exists (
      select 1 from public.product_options o
      where o.product_id = new.product_id and o.name = k and v = any (o."values")
    ) then
      raise exception using errcode = 'P0001', message = 'INVALID_VARIANT_OPTION',
        detail = format('"%s: %s" is not a defined option value for this product.', k, v);
    end if;
  end loop;

  if new.image_id is not null and not exists (
    select 1 from public.product_images i
    where i.id = new.image_id and i.product_id = new.product_id
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_VARIANT_IMAGE',
      detail = 'Variant image must belong to the same product.';
  end if;
  return new;
end;
$$;

create trigger product_variants_validate
  before insert or update of option_values, image_id on public.product_variants
  for each row execute function public.validate_variant_options();

-- Human readable label, e.g. "3-Seater / Velvet / Grey", in option sort order.
create or replace function public.variant_label(p_product_id uuid, p_option_values jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select string_agg(p_option_values ->> o.name, ' / ' order by o.sort_order, o.name)
       from public.product_options o
      where o.product_id = p_product_id and p_option_values ? o.name),
    (select string_agg(e.value, ' / ' order by e.key)
       from jsonb_each_text(p_option_values) e)
  );
$$;

-- -----------------------------------------------------------------------------
-- Hero slides
-- -----------------------------------------------------------------------------
create table public.hero_slides (
  id               uuid primary key default gen_random_uuid(),
  image_url        text not null,
  mobile_image_url text,
  headline         text not null check (length(btrim(headline)) between 1 and 120),
  subtext          text,
  cta_label        text,
  cta_url          text check (cta_url is null or cta_url ~ '^(/|https://)'),
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index hero_slides_sort_idx on public.hero_slides (sort_order);

-- -----------------------------------------------------------------------------
-- Customers
-- -----------------------------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text not null unique check (phone ~ '^\+254[17][0-9]{8}$'),
  email      text,
  address    text,
  city       text,
  notes      text,
  created_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (lower(full_name));

-- -----------------------------------------------------------------------------
-- Delivery zones
-- -----------------------------------------------------------------------------
create table public.delivery_zones (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  fee                     numeric(12,2) not null default 0 check (fee >= 0),
  estimated_days_min      integer not null default 1 check (estimated_days_min >= 0),
  estimated_days_max      integer not null default 3,
  free_delivery_threshold numeric(12,2) check (free_delivery_threshold is null or free_delivery_threshold > 0),
  is_active               boolean not null default true,
  notes                   text,
  sort_order              integer not null default 0,
  check (estimated_days_max >= estimated_days_min)
);

-- -----------------------------------------------------------------------------
-- Custom / made-to-order requests
-- -----------------------------------------------------------------------------
create table public.custom_requests (
  id                  uuid primary key default gen_random_uuid(),
  customer_name       text not null,
  phone               text not null check (phone ~ '^\+254[17][0-9]{8}$'),
  email               text,
  description         text not null,
  dimensions          text,
  preferred_material  text,
  budget              numeric(12,2) check (budget is null or budget >= 0),
  reference_image_url text,     -- storage path inside the private custom-requests bucket
  status              public.custom_request_status not null default 'new',
  quoted_price        numeric(12,2) check (quoted_price is null or quoted_price >= 0),
  deposit_amount      numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index custom_requests_status_idx on public.custom_requests (status, created_at desc);

create trigger custom_requests_updated_at
  before update on public.custom_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start 1;

create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique
                          default ('MH-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  customer_id             uuid not null references public.customers (id) on delete restrict,
  custom_request_id       uuid references public.custom_requests (id) on delete set null,
  status                  public.order_status not null default 'pending',
  payment_status          public.payment_status not null default 'unpaid',
  payment_method          text,
  subtotal                numeric(12,2) not null default 0 check (subtotal >= 0),
  delivery_fee            numeric(12,2) not null default 0 check (delivery_fee >= 0),
  delivery_zone_id        uuid references public.delivery_zones (id) on delete restrict,
  total                   numeric(12,2) not null default 0 check (total >= 0),
  deposit_amount          numeric(12,2) not null default 0 check (deposit_amount >= 0),
  balance_due             numeric(12,2) not null default 0 check (balance_due >= 0),
  delivery_address        text,
  delivery_city           text,
  preferred_delivery_date date,
  estimated_delivery_from date,
  estimated_delivery_to   date,
  notes                   text,
  internal_notes          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Order items (snapshots so later product edits never change past orders)
-- -----------------------------------------------------------------------------
create table public.order_items (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  -- restrict: products and variants with order history can only be deactivated
  product_id             uuid references public.products (id) on delete restrict,
  variant_id             uuid references public.product_variants (id) on delete restrict,
  product_name_snapshot  text not null,
  variant_label_snapshot text,
  sku_snapshot           text,
  unit_price_snapshot    numeric(12,2) not null check (unit_price_snapshot >= 0),
  quantity               integer not null check (quantity > 0),
  line_total             numeric(12,2) not null,
  check (line_total = unit_price_snapshot * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

-- -----------------------------------------------------------------------------
-- Inventory movements (append-only stock ledger)
-- -----------------------------------------------------------------------------
create table public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  variant_id      uuid references public.product_variants (id) on delete cascade,
  change_quantity integer not null check (change_quantity <> 0),
  reason          public.inventory_reason not null,
  order_id        uuid references public.orders (id) on delete set null,
  note            text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- -----------------------------------------------------------------------------
-- Guides (SEO content)
-- -----------------------------------------------------------------------------
create table public.guides (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt         text,
  body_markdown   text not null default '',
  cover_image_url text,
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Settings (key/value). is_public controls anonymous read access.
-- -----------------------------------------------------------------------------
create table public.settings (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
