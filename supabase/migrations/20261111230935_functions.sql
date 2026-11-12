-- =============================================================================
-- Mandela Heritage Furniture: RPC functions and stock triggers
--
-- Errors are raised with SQLSTATE P0001 and a stable machine-readable MESSAGE
-- (e.g. OUT_OF_STOCK). DETAIL holds JSON the storefront can show to the user.
-- =============================================================================

-- Today's date in Kenya (the server runs in UTC).
create or replace function public.kenya_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Nairobi')::date;
$$;

-- -----------------------------------------------------------------------------
-- create_order
--
-- p_customer: {full_name, phone, email?, address, city}
-- p_zone_id:  delivery_zones.id
-- p_items:    [{product_id, variant_id?, quantity}, ...]   (any price sent is ignored)
-- p_details:  {preferred_delivery_date?: 'YYYY-MM-DD', notes?: text}
--
-- Returns a JSON summary for the confirmation page and WhatsApp message.
-- All stock checks and decrements happen in this one transaction; any failure
-- rolls the whole order back.
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

  -- ---- customer upsert by phone (blank fields never erase stored ones) ------
  insert into public.customers as c (full_name, phone, email, address, city)
  values (v_name, v_phone, v_email, v_address, v_city)
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email     = coalesce(excluded.email, c.email),
        address   = coalesce(excluded.address, c.address),
        city      = coalesce(excluded.city, c.city)
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

-- -----------------------------------------------------------------------------
-- get_order_status: order number + phone must both match. Returns NULL when
-- they do not (same response either way, so it cannot be used to probe).
-- -----------------------------------------------------------------------------
create or replace function public.get_order_status(p_order_number text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
  from public.orders o
  join public.customers c on c.id = o.customer_id
  left join public.delivery_zones z on z.id = o.delivery_zone_id
  where o.order_number = upper(btrim(coalesce(p_order_number, '')))
    and c.phone = public.normalize_ke_phone(p_phone)
  limit 1;
$$;

revoke all on function public.get_order_status(text, text) from public;
grant execute on function public.get_order_status(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- submit_custom_request
-- p_reference_image_path: path returned by uploading to the private
-- 'custom-requests' bucket, must be inside 'uploads/'.
-- -----------------------------------------------------------------------------
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
  if length(v_desc) < 10 then
    raise exception using errcode = 'P0001', message = 'INVALID_DESCRIPTION', detail = '{"field":"description"}';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL', detail = '{"field":"email"}';
  end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000000) then
    raise exception using errcode = 'P0001', message = 'INVALID_BUDGET', detail = '{"field":"budget"}';
  end if;
  if v_path is not null and (v_path !~ '^uploads/[A-Za-z0-9._/-]+$' or v_path like '%..%') then
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

-- -----------------------------------------------------------------------------
-- adjust_stock (admin): restock / adjust / return on a product or variant,
-- atomically, with a logged inventory movement. Returns the new stock level.
-- -----------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_change     integer,
  p_reason     public.inventory_reason,
  p_note       text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new          integer;
  v_has_variants boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  if p_change is null or p_change = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_CHANGE';
  end if;
  if p_reason not in ('restock', 'adjustment', 'return') then
    raise exception using errcode = 'P0001', message = 'INVALID_REASON',
      detail = 'Use restock, adjustment or return. Sales and cancellations are logged automatically.';
  end if;

  select has_variants into v_has_variants from public.products where id = p_product_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
  end if;

  if p_variant_id is not null then
    update public.product_variants
       set stock_quantity = stock_quantity + p_change
     where id = p_variant_id and product_id = p_product_id
       and stock_quantity + p_change >= 0
    returning stock_quantity into v_new;
  else
    if v_has_variants then
      raise exception using errcode = 'P0001', message = 'VARIANT_REQUIRED',
        detail = 'This product has variations; adjust stock on a specific variant.';
    end if;
    update public.products
       set stock_quantity = stock_quantity + p_change
     where id = p_product_id and stock_quantity + p_change >= 0
    returning stock_quantity into v_new;
  end if;

  if v_new is null then
    raise exception using errcode = 'P0001', message = 'STOCK_WOULD_GO_NEGATIVE';
  end if;

  insert into public.inventory_movements
    (product_id, variant_id, change_quantity, reason, note, created_by)
  values
    (p_product_id, p_variant_id, p_change, p_reason, nullif(btrim(coalesce(p_note, '')), ''), auth.uid());

  return v_new;
end;
$$;

-- Supabase grants EXECUTE to anon directly, so revoking from PUBLIC is not enough.
revoke all on function public.adjust_stock(uuid, uuid, integer, public.inventory_reason, text) from public, anon;
grant execute on function public.adjust_stock(uuid, uuid, integer, public.inventory_reason, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Order cancellation restores stock.
-- Works however the status changes (admin UI update or SQL). Reverses exactly
-- the 'sale' movements logged for the order, to the same variant.
-- A cancelled order is final: it cannot be re-opened (stock already returned).
-- -----------------------------------------------------------------------------
create or replace function public.orders_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception using errcode = 'P0001', message = 'ORDER_CANCELLED_FINAL',
      detail = 'A cancelled order cannot be re-opened. Create a new order instead.';
  end if;
  return new;
end;
$$;

create trigger orders_guard_status
  before update of status on public.orders
  for each row execute function public.orders_guard_status();

create or replace function public.orders_restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  for m in
    select product_id, variant_id, sum(change_quantity)::integer as qty
    from public.inventory_movements
    where order_id = new.id and reason = 'sale'
    group by product_id, variant_id
  loop
    continue when m.qty = 0;  -- qty is negative for sales

    if m.variant_id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity - m.qty
       where id = m.variant_id;
    else
      update public.products
         set stock_quantity = stock_quantity - m.qty
       where id = m.product_id;
    end if;

    insert into public.inventory_movements
      (product_id, variant_id, change_quantity, reason, order_id, note, created_by)
    values
      (m.product_id, m.variant_id, -m.qty, 'cancelled_order', new.id,
       'Stock restored: order ' || new.order_number || ' cancelled', auth.uid());
  end loop;
  return new;
end;
$$;

create trigger orders_restore_stock_on_cancel
  after update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.orders_restore_stock_on_cancel();

-- Trigger functions are not callable as RPCs.
revoke all on function public.orders_restore_stock_on_cancel() from public, anon, authenticated;
revoke all on function public.orders_guard_status() from public, anon, authenticated;
revoke all on function public.enforce_category_depth() from public, anon, authenticated;
revoke all on function public.validate_variant_options() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
