-- =============================================================================
-- Security hardening (audit, 2026-11-12)
--
-- 1. Rate limits on the public RPCs (create_order, submit_custom_request,
--    get_order_status) and on anonymous reference-image uploads, so bots cannot
--    reserve all stock with fake orders, flood the inbox, brute-force order
--    tracking (order number + phone) or fill the storage bucket.
-- 2. An anonymous order can no longer overwrite a stored customer's name,
--    email or address by reusing their phone number.
-- 3. Upload paths for custom-request images are fixed to uploads/<uuid>.<ext>.
-- 4. The product-images bucket can no longer be listed by visitors (files are
--    still served through their public URLs).
-- 5. Write privileges removed from views; rls_auto_enable() not callable via API.
-- 6. Link and image URL columns only accept site paths or https:// URLs
--    (blocks javascript: and protocol-relative //evil.example links).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Private schema: not exposed through the REST API.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.rate_limits (
  bucket       text        not null,
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, key, window_start)
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- Caller's IP as seen by Supabase's gateway (Cloudflare header first). NULL
-- when unknown (SQL editor, migrations), in which case per-IP limits are skipped.
create or replace function private.client_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  h jsonb;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  return nullif(btrim(coalesce(h ->> 'cf-connecting-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '');
end;
$$;

-- Counts one hit for (bucket, key) in the current fixed window and raises
-- RATE_LIMITED once the count goes over p_max (p_max NULL = count only).
-- A rejected call rolls back its own hit, so the counter stays at the cap.
create or replace function private.hit_rate_limit(p_bucket text, p_key text, p_max integer, p_window interval)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_start timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_hits  integer;
begin
  if p_key is null or p_key = '' then
    return 0;
  end if;
  insert into private.rate_limits as r (bucket, key, window_start, hits)
  values (p_bucket, left(p_key, 120), v_start, 1)
  on conflict (bucket, key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if p_max is not null and v_hits > p_max then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      hint = 'Too many attempts. Please wait a while and try again.';
  end if;

  -- Housekeeping, roughly once per 200 calls.
  if random() < 0.005 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits;
end;
$$;

create or replace function private.rate_limit_hits(p_bucket text, p_key text, p_window interval)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select hits from private.rate_limits
    where bucket = p_bucket and key = left(p_key, 120)
      and window_start = date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00')
  ), 0);
$$;

revoke all on function private.client_ip() from public, anon, authenticated;
revoke all on function private.hit_rate_limit(text, text, integer, interval) from public, anon, authenticated;
revoke all on function private.rate_limit_hits(text, text, interval) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: anonymous reference-image uploads (custom requests)
-- Policy helper: limits uploads per IP and in total. Runs as its owner so it
-- can write the counters; visitors can only reach it through the policy.
-- -----------------------------------------------------------------------------
create or replace function private.allow_reference_upload()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if coalesce(public.is_admin(), false) then
    return true;
  end if;
  perform private.hit_rate_limit('upload_ip',  private.client_ip(), 6,   interval '1 hour');
  perform private.hit_rate_limit('upload_all', 'all',               100, interval '1 hour');
  return true;
end;
$$;

revoke all on function private.allow_reference_upload() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.allow_reference_upload() to anon, authenticated;

drop policy if exists "custom-requests: anyone uploads into uploads/" on storage.objects;
create policy "custom-requests: anyone uploads a reference image"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'custom-requests'
    and name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic)$'
    and (select private.allow_reference_upload())
  );

-- product-images: public URLs work without a SELECT policy on a public bucket;
-- only admins need to list the bucket.
drop policy if exists "product-images: public read" on storage.objects;
create policy "product-images: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Views are read-only; rls_auto_enable is an internal event-trigger helper.
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.product_summaries, public.admin_inventory, public.admin_customer_stats
  from anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- URL columns: site paths ("/shop") or https:// only.
-- -----------------------------------------------------------------------------
alter table public.hero_slides
  add constraint hero_slides_cta_url_safe
    check (cta_url is null or cta_url ~ '^/([^/\\]|$)' or cta_url ~ '^https://[^\s]+$'),
  add constraint hero_slides_image_url_safe
    check (image_url ~ '^(https://|/[^/\\])'),
  add constraint hero_slides_mobile_image_url_safe
    check (mobile_image_url is null or mobile_image_url ~ '^(https://|/[^/\\])');
alter table public.product_images
  add constraint product_images_url_safe check (url ~ '^(https://|/[^/\\])');
alter table public.categories
  add constraint categories_image_url_safe check (image_url is null or image_url ~ '^(https://|/[^/\\])');
alter table public.guides
  add constraint guides_cover_image_url_safe check (cover_image_url is null or cover_image_url ~ '^(https://|/[^/\\])');

-- -----------------------------------------------------------------------------
-- get_order_status: per-IP limit, and an order number locks after 10 wrong
-- phone numbers in an hour (stops guessing the phone for a known order).
-- -----------------------------------------------------------------------------
drop function if exists public.get_order_status(text, text);
create function public.get_order_status(p_order_number text, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_no  text := left(upper(btrim(coalesce(p_order_number, ''))), 40);
  v_res jsonb;
begin
  perform private.hit_rate_limit('track_ip', private.client_ip(), 30, interval '1 hour');
  if private.rate_limit_hits('track_miss', v_no, interval '1 hour') >= 10 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED',
      hint = 'Too many attempts. Please wait a while and try again.';
  end if;

  select jsonb_build_object(
    'order_number',            o.order_number,
    'status',                  o.status,
    'payment_status',          o.payment_status,
    'created_at',              o.created_at,
    'updated_at',              o.updated_at,
    'delivery_zone',           z.name,
    'preferred_delivery_date', o.preferred_delivery_date,
    'estimated_delivery_from', o.estimated_delivery_from,
    'estimated_delivery_to',   o.estimated_delivery_to,
    'total',                   o.total,
    'balance_due',             o.balance_due,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', oi.product_name_snapshot,
               'variant_label', oi.variant_label_snapshot,
               'quantity', oi.quantity) order by oi.product_name_snapshot)
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_res
  from public.orders o
  join public.customers c on c.id = o.customer_id
  left join public.delivery_zones z on z.id = o.delivery_zone_id
  where o.order_number = v_no
    and c.phone = public.normalize_ke_phone(p_phone)
  limit 1;

  if v_res is null and v_no <> '' then
    perform private.hit_rate_limit('track_miss', v_no, null, interval '1 hour');
  end if;
  return v_res;
end;
$$;

revoke all on function public.get_order_status(text, text) from public;
grant execute on function public.get_order_status(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- create_order and submit_custom_request, re-created with the limits above.
-- -----------------------------------------------------------------------------

create or replace function public.create_order(
  p_customer jsonb,
  p_zone_id  uuid,
  p_items    jsonb,
  p_details  jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_uuid_re  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

  v_name     text := left(btrim(coalesce(p_customer ->> 'full_name', '')), 120);
  v_phone    text := public.normalize_ke_phone(p_customer ->> 'phone');
  v_email    text := nullif(lower(btrim(coalesce(p_customer ->> 'email', ''))), '');
  v_address  text := nullif(left(btrim(coalesce(p_customer ->> 'address', '')), 500), '');
  v_city     text := nullif(left(btrim(coalesce(p_customer ->> 'city', '')), 120), '');
  v_notes    text := nullif(left(btrim(coalesce(p_details ->> 'notes', '')), 1000), '');
  v_pref_raw text := nullif(btrim(coalesce(p_details ->> 'preferred_delivery_date', '')), '');
  v_pref     date;
  v_today    date := public.kenya_today();

  v_zone        public.delivery_zones%rowtype;
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;

  v_item        jsonb;
  v_qty         integer;
  v_product     public.products%rowtype;
  v_variant     public.product_variants%rowtype;
  v_variant_id  uuid;
  v_unit_price  numeric(12,2);
  v_label       text;
  v_sku         text;
  v_rows        integer;
  v_available   integer;

  v_subtotal    numeric(12,2) := 0;
  v_fee         numeric(12,2);
  v_total       numeric(12,2);
  v_deposit     numeric(12,2) := 0;
  v_deposit_pct numeric;
  v_needs_dep   boolean := false;
  v_all_free    boolean := true;
  v_max_lead    integer := 0;
  v_est_from    date;
  v_est_to      date;
  v_lines       jsonb := '[]'::jsonb;
begin
  -- ---- validate customer -----------------------------------------------------
  if length(v_name) < 2 then
    raise exception using errcode = 'P0001', message = 'INVALID_NAME',
      detail = '{"field":"full_name"}';
  end if;
  if v_phone is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PHONE',
      detail = '{"field":"phone"}';
  end if;

  -- ---- abuse limits: stops bots reserving all stock with fake orders ---------
  -- (signed-in admins/staff are exempt)
  if not coalesce(public.is_admin(), false) then
    perform private.hit_rate_limit('order_ip',    private.client_ip(), 10,  interval '1 hour');
    perform private.hit_rate_limit('order_phone', v_phone,             5,   interval '1 hour');
    perform private.hit_rate_limit('order_all',   'all',               120, interval '1 hour');
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL',
      detail = '{"field":"email"}';
  end if;
  if v_address is null or v_city is null then
    raise exception using errcode = 'P0001', message = 'INVALID_ADDRESS',
      detail = '{"field":"address"}';
  end if;

  if v_pref_raw is not null then
    if v_pref_raw !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception using errcode = 'P0001', message = 'INVALID_DATE',
        detail = '{"field":"preferred_delivery_date"}';
    end if;
    begin
      v_pref := v_pref_raw::date;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_DATE',
        detail = '{"field":"preferred_delivery_date"}';
    end;
    if v_pref < v_today then
      raise exception using errcode = 'P0001', message = 'INVALID_DATE',
        detail = '{"field":"preferred_delivery_date","reason":"in_past"}';
    end if;
  end if;

  -- ---- validate zone and cart -----------------------------------------------
  select * into v_zone from public.delivery_zones z where z.id = p_zone_id and z.is_active;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_ZONE',
      detail = '{"field":"delivery_zone"}';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'P0001', message = 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception using errcode = 'P0001', message = 'TOO_MANY_ITEMS';
  end if;

  -- ---- customer upsert by phone ---------------------------------------------
  -- Anyone can type any phone number, so an anonymous order never overwrites
  -- an existing customer's stored details; it only fills fields that are empty.
  -- The order keeps its own delivery address. Admins edit customers directly.
  insert into public.customers as c (full_name, phone, email, address, city)
  values (v_name, v_phone, v_email, v_address, v_city)
  on conflict (phone) do update
    set email   = coalesce(c.email, excluded.email),
        address = coalesce(c.address, excluded.address),
        city    = coalesce(c.city, excluded.city)
  returning c.id into v_customer_id;

  -- ---- order header (totals filled in below) ---------------------------------
  insert into public.orders (
    customer_id, delivery_zone_id, delivery_address, delivery_city,
    preferred_delivery_date, notes
  )
  values (v_customer_id, v_zone.id, v_address, v_city, v_pref, v_notes)
  returning id, order_number into v_order_id, v_order_no;

  -- ---- lines ----------------------------------------------------------------
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item ->> 'product_id', '') !~ c_uuid_re
       or coalesce(v_item ->> 'quantity', '') !~ '^\d{1,3}$' then
      raise exception using errcode = 'P0001', message = 'INVALID_ITEM';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then
      raise exception using errcode = 'P0001', message = 'INVALID_QUANTITY';
    end if;

    select * into v_product
    from public.products p
    where p.id = (v_item ->> 'product_id')::uuid and p.is_active;
    if not found then
      raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE',
        detail = jsonb_build_object('product_id', v_item ->> 'product_id')::text;
    end if;

    v_variant_id := null;
    v_label      := null;
    v_sku        := v_product.sku;
    v_unit_price := v_product.price;

    if v_product.has_variants then
      if coalesce(v_item ->> 'variant_id', '') !~ c_uuid_re then
        raise exception using errcode = 'P0001', message = 'VARIANT_REQUIRED',
          detail = jsonb_build_object('product', v_product.name)::text;
      end if;

      select * into v_variant
      from public.product_variants pv
      where pv.id = (v_item ->> 'variant_id')::uuid
        and pv.product_id = v_product.id
        and pv.is_active;
      if not found then
        raise exception using errcode = 'P0001', message = 'VARIANT_UNAVAILABLE',
          detail = jsonb_build_object('product', v_product.name)::text;
      end if;

      v_variant_id := v_variant.id;
      v_unit_price := coalesce(v_variant.price, v_product.price);
      v_sku        := coalesce(v_variant.sku, v_product.sku);
      v_label      := public.variant_label(v_product.id, v_variant.option_values);
    end if;

    -- Stock: made-to-order items are built after ordering, so stock is not
    -- checked or decremented for them (they require a deposit instead).
    if not v_product.is_made_to_order then
      if v_variant_id is not null then
        update public.product_variants
           set stock_quantity = stock_quantity - v_qty
         where id = v_variant_id and stock_quantity >= v_qty;
        get diagnostics v_rows = row_count;
        if v_rows = 0 then
          select stock_quantity into v_available
          from public.product_variants where id = v_variant_id;
        end if;
      else
        update public.products
           set stock_quantity = stock_quantity - v_qty
         where id = v_product.id and stock_quantity >= v_qty;
        get diagnostics v_rows = row_count;
        if v_rows = 0 then
          select stock_quantity into v_available
          from public.products where id = v_product.id;
        end if;
      end if;

      if v_rows = 0 then
        raise exception using errcode = 'P0001', message = 'OUT_OF_STOCK',
          detail = jsonb_build_object(
            'product', v_product.name,
            'variant', v_label,
            'requested', v_qty,
            'available', coalesce(v_available, 0)
          )::text;
      end if;

      insert into public.inventory_movements
        (product_id, variant_id, change_quantity, reason, order_id, note)
      values
        (v_product.id, v_variant_id, -v_qty, 'sale', v_order_id, 'Online order ' || v_order_no);
    else
      v_needs_dep := true;
    end if;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot,
      sku_snapshot, unit_price_snapshot, quantity, line_total
    )
    values (
      v_order_id, v_product.id, v_variant_id, v_product.name, v_label,
      v_sku, v_unit_price, v_qty, v_unit_price * v_qty
    );

    v_subtotal := v_subtotal + v_unit_price * v_qty;
    v_all_free := v_all_free and v_product.free_delivery;
    v_max_lead := greatest(v_max_lead, v_product.lead_time_days);
    v_lines := v_lines || jsonb_build_object(
      'product_id',    v_product.id,
      'variant_id',    v_variant_id,
      'name',          v_product.name,
      'variant_label', v_label,
      'sku',           v_sku,
      'unit_price',    v_unit_price,
      'quantity',      v_qty,
      'line_total',    v_unit_price * v_qty,
      'made_to_order', v_product.is_made_to_order
    );
  end loop;

  -- ---- totals ---------------------------------------------------------------
  if v_all_free
     or (v_zone.free_delivery_threshold is not null and v_subtotal >= v_zone.free_delivery_threshold) then
    v_fee := 0;
  else
    v_fee := v_zone.fee;
  end if;
  v_total := v_subtotal + v_fee;

  if v_needs_dep then
    select coalesce((s.value #>> '{}')::numeric, 50) into v_deposit_pct
    from public.settings s where s.key = 'deposit_percent';
    v_deposit_pct := least(greatest(coalesce(v_deposit_pct, 50), 0), 100);
    v_deposit := round(v_total * v_deposit_pct / 100, 0);
  end if;

  v_est_from := v_today + v_max_lead + v_zone.estimated_days_min;
  v_est_to   := v_today + v_max_lead + v_zone.estimated_days_max;

  update public.orders
     set subtotal                = v_subtotal,
         delivery_fee            = v_fee,
         total                   = v_total,
         deposit_amount          = v_deposit,
         balance_due             = v_total - v_deposit,
         estimated_delivery_from = v_est_from,
         estimated_delivery_to   = v_est_to
   where id = v_order_id;

  return jsonb_build_object(
    'order_number',            v_order_no,
    'status',                  'pending',
    'payment_status',          'unpaid',
    'customer',                jsonb_build_object('full_name', v_name, 'phone', v_phone),
    'delivery_zone',           v_zone.name,
    'delivery_zone_notes',     v_zone.notes,
    'delivery_address',        v_address,
    'delivery_city',           v_city,
    'preferred_delivery_date', v_pref,
    'estimated_delivery_from', v_est_from,
    'estimated_delivery_to',   v_est_to,
    'items',                   v_lines,
    'subtotal',                v_subtotal,
    'delivery_fee',            v_fee,
    'total',                   v_total,
    'deposit_amount',          v_deposit,
    'balance_due',             v_total - v_deposit,
    'notes',                   v_notes
  );
end;
$$;

revoke all on function public.create_order(jsonb, uuid, jsonb, jsonb) from public;
grant execute on function public.create_order(jsonb, uuid, jsonb, jsonb) to anon, authenticated;

create or replace function public.submit_custom_request(
  p_customer_name        text,
  p_phone                text,
  p_description          text,
  p_email                text    default null,
  p_dimensions           text    default null,
  p_preferred_material   text    default null,
  p_budget               numeric default null,
  p_reference_image_path text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := left(btrim(coalesce(p_customer_name, '')), 120);
  v_phone text := public.normalize_ke_phone(p_phone);
  v_desc  text := left(btrim(coalesce(p_description, '')), 4000);
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_path  text := nullif(btrim(coalesce(p_reference_image_path, '')), '');
  v_id    uuid;
begin
  if length(v_name) < 2 then
    raise exception using errcode = 'P0001', message = 'INVALID_NAME', detail = '{"field":"customer_name"}';
  end if;
  if v_phone is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PHONE', detail = '{"field":"phone"}';
  end if;
  if not coalesce(public.is_admin(), false) then
    perform private.hit_rate_limit('custom_ip',    private.client_ip(), 5,  interval '1 hour');
    perform private.hit_rate_limit('custom_phone', v_phone,             3,  interval '1 hour');
    perform private.hit_rate_limit('custom_all',   'all',               60, interval '1 hour');
  end if;
  if length(v_desc) < 10 then
    raise exception using errcode = 'P0001', message = 'INVALID_DESCRIPTION', detail = '{"field":"description"}';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL', detail = '{"field":"email"}';
  end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000000) then
    raise exception using errcode = 'P0001', message = 'INVALID_BUDGET', detail = '{"field":"budget"}';
  end if;
  if v_path is not null and (v_path !~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic)$') then
    raise exception using errcode = 'P0001', message = 'INVALID_IMAGE_PATH', detail = '{"field":"reference_image"}';
  end if;

  insert into public.custom_requests (
    customer_name, phone, email, description, dimensions, preferred_material,
    budget, reference_image_url
  )
  values (
    v_name, v_phone, v_email, v_desc,
    nullif(left(btrim(coalesce(p_dimensions, '')), 300), ''),
    nullif(left(btrim(coalesce(p_preferred_material, '')), 300), ''),
    p_budget, v_path
  )
  returning id into v_id;

  return jsonb_build_object(
    'reference', 'CR-' || upper(left(replace(v_id::text, '-', ''), 8)),
    'status', 'new'
  );
end;
$$;

revoke all on function public.submit_custom_request(text, text, text, text, text, text, numeric, text) from public;
grant execute on function public.submit_custom_request(text, text, text, text, text, text, numeric, text) to anon, authenticated;

-- End of security hardening.
