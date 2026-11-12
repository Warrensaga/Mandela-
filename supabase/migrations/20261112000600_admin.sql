-- =============================================================================
-- Mandela Heritage Furniture: admin dashboard support (Phase 3)
--
-- Everything here runs as the caller (SECURITY INVOKER), so the existing
-- admin RLS policies decide access. Each function also checks is_admin()
-- up front for a clear error, and is executable by `authenticated` only.
-- =============================================================================

create or replace function public.assert_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inventory: one row per variant (variant products) or per simple product
-- -----------------------------------------------------------------------------
create view public.admin_inventory
with (security_invoker = true)
as
select
  p.id                      as product_id,
  v.id                      as variant_id,
  p.name                    as product_name,
  p.slug                    as product_slug,
  public.variant_label(p.id, v.option_values) as variant_label,
  v.sku                     as sku,
  v.stock_quantity          as stock_quantity,
  v.low_stock_threshold     as low_stock_threshold,
  (v.is_active and p.is_active) as is_active,
  p.is_made_to_order        as is_made_to_order,
  p.category_id             as category_id,
  v.sort_order              as sort_order
from public.products p
join public.product_variants v on v.product_id = p.id
where p.has_variants
union all
select
  p.id, null, p.name, p.slug, null, p.sku, p.stock_quantity, p.low_stock_threshold,
  p.is_active, p.is_made_to_order, p.category_id, 0
from public.products p
where not p.has_variants;

-- -----------------------------------------------------------------------------
-- Customers with order totals (cancelled orders excluded from spend)
-- -----------------------------------------------------------------------------
create view public.admin_customer_stats
with (security_invoker = true)
as
select
  c.*,
  coalesce(s.order_count, 0)  as order_count,
  coalesce(s.total_spent, 0)  as total_spent,
  s.last_order_at
from public.customers c
left join lateral (
  select count(*)::integer as order_count,
         sum(o.total) filter (where o.status <> 'cancelled') as total_spent,
         max(o.created_at) as last_order_at
  from public.orders o
  where o.customer_id = c.id
) s on true;

revoke all on public.admin_inventory, public.admin_customer_stats from anon;
grant select on public.admin_inventory, public.admin_customer_stats to authenticated;

-- -----------------------------------------------------------------------------
-- Dashboard numbers in one call
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today  timestamptz := date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  v_week   timestamptz := date_trunc('week', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  v_month  timestamptz := date_trunc('month', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  v_result jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'today', (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0))
              from public.orders where status <> 'cancelled' and created_at >= v_today),
    'week',  (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0))
              from public.orders where status <> 'cancelled' and created_at >= v_week),
    'month', (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0))
              from public.orders where status <> 'cancelled' and created_at >= v_month),
    'pending_orders', (select count(*) from public.orders where status = 'pending'),
    'unpaid_orders',  (select count(*) from public.orders where status <> 'cancelled' and payment_status = 'unpaid'),
    'low_stock_count', (select count(*) from public.admin_inventory
                        where is_active and not is_made_to_order
                          and stock_quantity > 0 and stock_quantity <= low_stock_threshold),
    'out_of_stock_count', (select count(*) from public.admin_inventory
                           where is_active and not is_made_to_order and stock_quantity <= 0),
    'stock_alerts', coalesce((
      select jsonb_agg(a order by a.stock_quantity, a.product_name)
      from (
        select product_id, variant_id, product_name, variant_label, sku, stock_quantity, low_stock_threshold
        from public.admin_inventory
        where is_active and not is_made_to_order and stock_quantity <= low_stock_threshold
        order by stock_quantity, product_name
        limit 10
      ) a
    ), '[]'::jsonb),
    'recent_orders', coalesce((
      select jsonb_agg(r order by r.created_at desc)
      from (
        select o.id, o.order_number, o.status, o.payment_status, o.total, o.created_at, c.full_name
        from public.orders o join public.customers c on c.id = o.customer_id
        order by o.created_at desc
        limit 8
      ) r
    ), '[]'::jsonb),
    'top_sellers', coalesce((
      select jsonb_agg(t order by t.quantity desc)
      from (
        select oi.product_name_snapshot as name, sum(oi.quantity)::integer as quantity, sum(oi.line_total) as revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.status <> 'cancelled' and o.created_at >= now() - interval '30 days'
        group by oi.product_name_snapshot
        order by sum(oi.quantity) desc
        limit 5
      ) t
    ), '[]'::jsonb),
    'new_custom_requests', (select count(*) from public.custom_requests where status = 'new'),
    'latest_custom_requests', coalesce((
      select jsonb_agg(cr order by cr.created_at desc)
      from (
        select id, customer_name, description, status, created_at
        from public.custom_requests
        where status in ('new', 'quoted')
        order by created_at desc
        limit 5
      ) cr
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Drag-and-drop reordering: sets sort_order = position in p_ids
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_sort_order(p_table text, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_table not in ('categories', 'hero_slides', 'product_images', 'product_options', 'product_variants', 'delivery_zones') then
    raise exception using errcode = 'P0001', message = 'INVALID_TABLE';
  end if;
  execute format(
    'update public.%I t set sort_order = x.pos from unnest($1) with ordinality as x(id, pos) where t.id = x.id',
    p_table
  ) using p_ids;
end;
$$;

-- -----------------------------------------------------------------------------
-- Option usage, for warnings before renaming or removing values
-- Returns [{option, value, variants, ordered_lines}]
-- -----------------------------------------------------------------------------
create or replace function public.admin_option_usage(p_product_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'option', u.option_name,
      'value', u.option_value,
      'variants', u.variants,
      'ordered_lines', u.ordered_lines
    ))
    from (
      select e.key as option_name, e.value as option_value,
             count(distinct v.id) as variants, count(oi.id) as ordered_lines
      from public.product_variants v
      cross join lateral jsonb_each_text(v.option_values) e
      left join public.order_items oi on oi.variant_id = v.id
      where v.product_id = p_product_id
      group by e.key, e.value
    ) u
  ), '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- Save a product's options.
--
-- p_options: [{"name": "Size", "values": ["2-Seater", "3-Seater"]}, ...] in display order
-- p_renames: {"options": {"Old name": "New name"},
--             "values":  {"<new option name>": {"Old value": "New value"}}}
--
-- 1. Rewrites existing variants' option_values for renamed options/values.
-- 2. Replaces the option rows.
-- 3. Variants that no longer fit the options (removed value, removed or added
--    option) are DEACTIVATED if they have order history, otherwise deleted.
-- Returns {renamed, deactivated, deleted}.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_product_options(
  p_product_id uuid,
  p_options    jsonb,
  p_renames    jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_opt         jsonb;
  v_names       text[] := '{}';
  v_name        text;
  v_values      text[];
  v_i           integer := 0;
  v_opt_renames jsonb := coalesce(p_renames -> 'options', '{}'::jsonb);
  v_val_renames jsonb := coalesce(p_renames -> 'values', '{}'::jsonb);
  v_variant     record;
  v_new         jsonb;
  v_key         text;
  v_val         text;
  v_renamed     integer := 0;
  v_deactivated integer := 0;
  v_deleted     integer := 0;
  v_fits        boolean;
begin
  perform public.assert_admin();

  if jsonb_typeof(p_options) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_OPTIONS';
  end if;

  -- Validate: names unique and non-empty, values unique and non-empty.
  for v_opt in select value from jsonb_array_elements(p_options) loop
    v_name := btrim(coalesce(v_opt ->> 'name', ''));
    if v_name = '' then
      raise exception using errcode = 'P0001', message = 'INVALID_OPTIONS', detail = 'Every option needs a name.';
    end if;
    if v_name = any (v_names) then
      raise exception using errcode = 'P0001', message = 'INVALID_OPTIONS', detail = format('Option "%s" appears twice.', v_name);
    end if;
    v_names := v_names || v_name;
    select array_agg(btrim(x)) into v_values from jsonb_array_elements_text(v_opt -> 'values') x;
    if v_values is null or cardinality(v_values) = 0 or '' = any (v_values) then
      raise exception using errcode = 'P0001', message = 'INVALID_OPTIONS', detail = format('Option "%s" needs at least one value, and no blank values.', v_name);
    end if;
    if cardinality(v_values) <> (select count(distinct x) from unnest(v_values) x) then
      raise exception using errcode = 'P0001', message = 'INVALID_OPTIONS', detail = format('Option "%s" has a duplicate value.', v_name);
    end if;
  end loop;

  -- Replace option rows first, so renamed variant values validate.
  delete from public.product_options where product_id = p_product_id;
  for v_opt in select value from jsonb_array_elements(p_options) loop
    v_i := v_i + 1;
    insert into public.product_options (product_id, name, "values", sort_order)
    select p_product_id, btrim(v_opt ->> 'name'), array_agg(btrim(x)), v_i
    from jsonb_array_elements_text(v_opt -> 'values') x;
  end loop;

  for v_variant in
    select v.id, v.option_values,
           exists (select 1 from public.order_items oi where oi.variant_id = v.id) as has_history
    from public.product_variants v
    where v.product_id = p_product_id
  loop
    -- Apply renames.
    v_new := '{}'::jsonb;
    for v_key, v_val in select key, value from jsonb_each_text(v_variant.option_values) loop
      v_key := coalesce(v_opt_renames ->> v_key, v_key);
      v_val := coalesce(v_val_renames -> v_key ->> v_val, v_val);
      v_new := v_new || jsonb_build_object(v_key, v_val);
    end loop;

    -- Does it fit the new options exactly (same keys, allowed values)?
    v_fits := (select count(*) from jsonb_object_keys(v_new)) = cardinality(v_names)
      and not exists (
        select 1 from jsonb_each_text(v_new) e
        where not exists (
          select 1 from public.product_options o
          where o.product_id = p_product_id and o.name = e.key and e.value = any (o."values")
        )
      );

    if v_fits then
      if v_new <> v_variant.option_values then
        if exists (select 1 from public.product_variants
                   where product_id = p_product_id and option_values = v_new and id <> v_variant.id) then
          raise exception using errcode = 'P0001', message = 'DUPLICATE_VARIANT',
            detail = 'A rename would make two variants identical. Rename one value at a time.';
        end if;
        update public.product_variants set option_values = v_new where id = v_variant.id;
        v_renamed := v_renamed + 1;
      end if;
    elsif v_variant.has_history then
      -- Keep the row (and its old values) for order history, but take it off sale.
      -- The validation trigger only runs when option_values change, so this is allowed.
      update public.product_variants set is_active = false where id = v_variant.id;
      v_deactivated := v_deactivated + 1;
    else
      delete from public.product_variants where id = v_variant.id;
      v_deleted := v_deleted + 1;
    end if;
  end loop;

  update public.products set has_variants = cardinality(v_names) > 0 where id = p_product_id;

  return jsonb_build_object('renamed', v_renamed, 'deactivated', v_deactivated, 'deleted', v_deleted);
end;
$$;

-- -----------------------------------------------------------------------------
-- Generate missing variants for every option combination. Never deletes.
-- New variants: active, stock 0, price null (uses product price).
-- -----------------------------------------------------------------------------
create or replace function public.admin_generate_variants(p_product_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_prefix  text;
  v_created integer;
  v_start   integer;
begin
  perform public.assert_admin();
  select coalesce(sku, upper(left(regexp_replace(slug, '[^a-z0-9]', '', 'g'), 8))) into v_prefix
  from public.products where id = p_product_id;
  if v_prefix is null then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
  end if;
  select coalesce(max(sort_order), 0) into v_start from public.product_variants where product_id = p_product_id;

  with recursive opts as (
    select o.name, o."values", row_number() over (order by o.sort_order, o.name) as rn
    from public.product_options o
    where o.product_id = p_product_id
  ),
  combos as (
    select 0::bigint as rn, '{}'::jsonb as ov, ''::text as code, ''::text as ord
    union all
    select o.rn,
           c.ov || jsonb_build_object(o.name, val.v),
           c.code || '-' || upper(left(regexp_replace(val.v, '[^A-Za-z0-9]', '', 'g'), 3)),
           c.ord || lpad(val.i::text, 3, '0')
    from combos c
    join opts o on o.rn = c.rn + 1
    cross join lateral unnest(o."values") with ordinality as val(v, i)
  ),
  missing as (
    select c.ov, c.code, c.ord
    from combos c
    where c.rn = (select count(*) from opts) and c.rn > 0
      and not exists (
        select 1 from public.product_variants v
        where v.product_id = p_product_id and v.option_values = c.ov
      )
  ),
  candidates as (
    -- Values that abbreviate the same way (Grey/Green) get a -2, -3 suffix.
    select m.ov, m.ord,
           v_prefix || m.code ||
             case when row_number() over (partition by m.code order by m.ord) > 1
                  then '-' || row_number() over (partition by m.code order by m.ord) else '' end as sku
    from missing m
  ),
  inserted as (
    insert into public.product_variants (product_id, sku, option_values, stock_quantity, sort_order)
    select p_product_id,
           -- Only use the generated SKU if it is free; otherwise leave it for the admin.
           case when exists (select 1 from public.product_variants x where x.sku = c.sku) then null else c.sku end,
           c.ov, 0,
           v_start + row_number() over (order by c.ord)
    from candidates c
    returning 1
  )
  select count(*) into v_created from inserted;

  update public.products set has_variants = true where id = p_product_id and v_created > 0;
  return v_created;
end;
$$;

-- -----------------------------------------------------------------------------
-- Convert an accepted custom request into an order.
-- One line "Custom: <title>" at the quoted price; deposit from the request
-- (or deposit_percent of the total); delivery fee from the zone.
-- -----------------------------------------------------------------------------
create or replace function public.admin_convert_custom_request(
  p_request_id uuid,
  p_zone_id    uuid,
  p_title      text,
  p_address    text,
  p_city       text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r             public.custom_requests%rowtype;
  z             public.delivery_zones%rowtype;
  v_customer_id uuid;
  v_order_id    uuid;
  v_order_no    text;
  v_title       text := nullif(btrim(coalesce(p_title, '')), '');
  v_total       numeric(12,2);
  v_deposit     numeric(12,2);
  v_pct         numeric;
begin
  perform public.assert_admin();

  select * into r from public.custom_requests where id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if r.quoted_price is null or r.quoted_price <= 0 then
    raise exception using errcode = 'P0001', message = 'QUOTE_REQUIRED', detail = 'Set a quoted price first.';
  end if;
  if exists (select 1 from public.orders where custom_request_id = r.id and status <> 'cancelled') then
    raise exception using errcode = 'P0001', message = 'ALREADY_CONVERTED';
  end if;
  select * into z from public.delivery_zones where id = p_zone_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_ZONE';
  end if;
  if nullif(btrim(coalesce(p_address, '')), '') is null or nullif(btrim(coalesce(p_city, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_ADDRESS';
  end if;

  insert into public.customers as c (full_name, phone, email, address, city)
  values (r.customer_name, r.phone, r.email, btrim(p_address), btrim(p_city))
  on conflict (phone) do update
    set email   = coalesce(excluded.email, c.email),
        address = excluded.address,
        city    = excluded.city
  returning c.id into v_customer_id;

  v_total := r.quoted_price + z.fee;
  if r.deposit_amount is not null and r.deposit_amount > 0 then
    v_deposit := least(r.deposit_amount, v_total);
  else
    select coalesce((s.value #>> '{}')::numeric, 50) into v_pct from public.settings s where s.key = 'deposit_percent';
    v_deposit := round(v_total * coalesce(v_pct, 50) / 100, 0);
  end if;

  insert into public.orders (
    customer_id, custom_request_id, status, subtotal, delivery_fee, delivery_zone_id, total,
    deposit_amount, balance_due, delivery_address, delivery_city, notes, internal_notes
  )
  values (
    v_customer_id, r.id, 'confirmed', r.quoted_price, z.fee, z.id, v_total,
    v_deposit, v_total - v_deposit, btrim(p_address), btrim(p_city),
    left(r.description, 1000), 'Converted from custom request'
  )
  returning id, order_number into v_order_id, v_order_no;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot,
    sku_snapshot, unit_price_snapshot, quantity, line_total
  )
  values (
    v_order_id, null, null, 'Custom: ' || coalesce(v_title, left(r.description, 80)),
    nullif(concat_ws(' / ', r.dimensions, r.preferred_material), ''),
    null, r.quoted_price, 1, r.quoted_price
  );

  update public.custom_requests
     set status = case when status in ('new', 'quoted') then 'accepted'::public.custom_request_status else status end,
         deposit_amount = v_deposit
   where id = r.id;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_no);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants: admin functions for signed-in users only (they still check is_admin)
-- -----------------------------------------------------------------------------
revoke all on function public.assert_admin() from public, anon;
revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_set_sort_order(text, uuid[]) from public, anon;
revoke all on function public.admin_option_usage(uuid) from public, anon;
revoke all on function public.admin_set_product_options(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.admin_generate_variants(uuid) from public, anon;
revoke all on function public.admin_convert_custom_request(uuid, uuid, text, text, text) from public, anon;

grant execute on function public.assert_admin() to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_set_sort_order(text, uuid[]) to authenticated;
grant execute on function public.admin_option_usage(uuid) to authenticated;
grant execute on function public.admin_set_product_options(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.admin_generate_variants(uuid) to authenticated;
grant execute on function public.admin_convert_custom_request(uuid, uuid, text, text, text) to authenticated;
