-- =============================================================================
-- Mandela Heritage Furniture: Phase 1 RLS and RPC check
--
-- Run AFTER the migrations and seed.sql, as the database owner (Supabase SQL
-- Editor, or psql). It impersonates the anon, signed-in and admin roles.
-- Everything it creates (test order, test admin, custom request) is rolled
-- back, so it leaves no data behind and can be run any number of times.
--
-- Output: one row per check with PASS or FAIL. Every row must be PASS.
-- =============================================================================

drop table if exists rls_results;
create temp table rls_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res            jsonb := '[]'::jsonb;
  t              text;
  n              integer;
  j              jsonb;
  v_customer     jsonb := '{"full_name":"RLS Test Customer","phone":"0712 345 678","address":"1 Test Lane","city":"Nairobi"}';
  v_zone         uuid;
  v_zone_fee     numeric;
  v_simple       uuid;
  v_simple_price numeric;
  v_simple_stock integer;
  v_var_prod     uuid;
  v_var          uuid;
  v_var_price    numeric;
  v_var_stock    integer;
  v_oos          uuid;
  v_draft        uuid;
  v_order_no     text;
  v_admin        uuid := gen_random_uuid();
  v_stranger     uuid := gen_random_uuid();
begin
  -- ---------------------------------------------------------------------------
  -- Fixtures (read as owner)
  -- ---------------------------------------------------------------------------
  select id, fee into v_zone, v_zone_fee from public.delivery_zones where name = 'Nairobi Environs';
  select id, price, stock_quantity into v_simple, v_simple_price, v_simple_stock
    from public.products where slug = 'kito-coffee-table';
  select p.id, pv.id, coalesce(pv.price, p.price), pv.stock_quantity
    into v_var_prod, v_var, v_var_price, v_var_stock
    from public.products p
    join public.product_variants pv on pv.product_id = p.id
   where p.slug = 'amani-sofa' and pv.is_active and pv.stock_quantity > 0
   order by pv.sort_order limit 1;
  select id into v_oos   from public.products where slug = 'imara-wardrobe';
  select id into v_draft from public.products where slug = 'draft-bar-stool';

  if v_zone is null or v_simple is null or v_var is null or v_oos is null or v_draft is null then
    raise exception 'Seed data missing: run the migrations and supabase/seed.sql first.';
  end if;

  -- ---------------------------------------------------------------------------
  -- 1. Anonymous visitor: private tables are invisible
  -- ---------------------------------------------------------------------------
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  foreach t in array array['customers', 'orders', 'order_items', 'inventory_movements',
                           'custom_requests', 'admin_users'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      res := res || jsonb_build_object('c', 'anon cannot read ' || t, 'p', n = 0, 'd', n || ' rows visible');
    exception when insufficient_privilege then
      res := res || jsonb_build_object('c', 'anon cannot read ' || t, 'p', true, 'd', 'permission denied');
    end;
  end loop;

  -- ---------------------------------------------------------------------------
  -- 2. Anonymous visitor: public catalogue is readable, drafts are hidden
  -- ---------------------------------------------------------------------------
  select count(*) into n from public.products;
  res := res || jsonb_build_object('c', 'anon reads active products', 'p', n > 0, 'd', n || ' products');
  select count(*) into n from public.products where not is_active;
  res := res || jsonb_build_object('c', 'anon cannot see inactive products', 'p', n = 0, 'd', n || ' inactive visible');
  select count(*) into n from public.product_summaries where id = v_draft;
  res := res || jsonb_build_object('c', 'product_summaries hides inactive products', 'p', n = 0, 'd', n || ' rows');
  select count(*) into n from public.product_images where product_id = v_draft;
  res := res || jsonb_build_object('c', 'anon cannot see images of inactive products', 'p', n = 0, 'd', n || ' rows');
  select count(*) into n from public.product_variants;
  res := res || jsonb_build_object('c', 'anon reads active variants', 'p', n > 0, 'd', n || ' variants');
  select count(*) into n from public.product_options;
  res := res || jsonb_build_object('c', 'anon reads product options', 'p', n > 0, 'd', n || ' options');
  select count(*) into n from public.categories;
  res := res || jsonb_build_object('c', 'anon reads categories', 'p', n > 0, 'd', n || ' categories');
  select count(*) into n from public.hero_slides;
  res := res || jsonb_build_object('c', 'anon reads hero slides', 'p', n > 0, 'd', n || ' slides');
  select count(*) into n from public.delivery_zones;
  res := res || jsonb_build_object('c', 'anon reads delivery zones', 'p', n > 0, 'd', n || ' zones');
  select count(*) into n from public.settings;
  res := res || jsonb_build_object('c', 'anon reads public settings', 'p', n > 0, 'd', n || ' keys');

  -- ---------------------------------------------------------------------------
  -- 3. Anonymous visitor: cannot write anything directly
  -- ---------------------------------------------------------------------------
  begin
    update public.products set price = 1;
    get diagnostics n = row_count;
    res := res || jsonb_build_object('c', 'anon cannot update products', 'p', n = 0, 'd', n || ' rows changed');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot update products', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  begin
    insert into public.orders (customer_id) values (gen_random_uuid());
    res := res || jsonb_build_object('c', 'anon cannot insert orders', 'p', false, 'd', 'insert succeeded');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot insert orders', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  begin
    insert into public.customers (full_name, phone) values ('Intruder', '+254711111111');
    res := res || jsonb_build_object('c', 'anon cannot insert customers', 'p', false, 'd', 'insert succeeded');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot insert customers', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  begin
    update public.settings set value = '"hacked"' where key = 'whatsapp_number';
    get diagnostics n = row_count;
    res := res || jsonb_build_object('c', 'anon cannot change settings', 'p', n = 0, 'd', n || ' rows changed');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot change settings', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  begin
    perform public.adjust_stock(v_simple, null, 100, 'restock', 'should fail');
    res := res || jsonb_build_object('c', 'anon cannot call adjust_stock', 'p', false, 'd', 'call succeeded');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot call adjust_stock', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  -- ---------------------------------------------------------------------------
  -- 4. RPC flow (rolled back at the end of this block)
  -- ---------------------------------------------------------------------------
  begin
    -- 4a. anon places an order with a simple product and a variant, sending fake prices
    j := public.create_order(
      v_customer,
      v_zone,
      jsonb_build_array(
        jsonb_build_object('product_id', v_simple,   'quantity', 1, 'unit_price', 1),
        jsonb_build_object('product_id', v_var_prod, 'variant_id', v_var, 'quantity', 1, 'price', 1)
      ),
      jsonb_build_object('notes', 'RLS test order')
    );
    v_order_no := j ->> 'order_number';

    res := res || jsonb_build_object('c', 'anon create_order returns an order number',
      'p', v_order_no ~ '^MH-[0-9]{6,}$', 'd', coalesce(v_order_no, 'null'));
    res := res || jsonb_build_object('c', 'create_order ignores client prices (uses DB prices)',
      'p', (j ->> 'subtotal')::numeric = v_simple_price + v_var_price,
      'd', 'subtotal ' || (j ->> 'subtotal') || ', expected ' || (v_simple_price + v_var_price));
    res := res || jsonb_build_object('c', 'create_order adds the zone delivery fee',
      'p', (j ->> 'delivery_fee')::numeric = v_zone_fee
           and (j ->> 'total')::numeric = (j ->> 'subtotal')::numeric + v_zone_fee,
      'd', 'fee ' || (j ->> 'delivery_fee') || ', total ' || (j ->> 'total'));
    res := res || jsonb_build_object('c', 'create_order snapshots the variant label',
      'p', (j -> 'items' -> 1 ->> 'variant_label') is not null,
      'd', coalesce(j -> 'items' -> 1 ->> 'variant_label', 'null'));
    res := res || jsonb_build_object('c', 'create_order normalises the phone to +254',
      'p', j -> 'customer' ->> 'phone' = '+254712345678', 'd', j -> 'customer' ->> 'phone');

    -- 4b. tracking
    j := public.get_order_status(v_order_no, '+254712345678');
    res := res || jsonb_build_object('c', 'get_order_status works with the right phone',
      'p', j is not null and j ->> 'status' = 'pending', 'd', coalesce(j ->> 'status', 'null'));
    res := res || jsonb_build_object('c', 'get_order_status hides address and customer details',
      'p', j is not null and not (j ? 'delivery_address') and not (j ? 'customer'), 'd', 'keys: ' ||
      coalesce((select string_agg(k, ', ') from jsonb_object_keys(j) k), ''));
    j := public.get_order_status(v_order_no, '0799999999');
    res := res || jsonb_build_object('c', 'get_order_status returns nothing for a wrong phone',
      'p', j is null, 'd', coalesce(j::text, 'null'));

    -- 4c. rejected orders
    begin
      perform public.create_order(v_customer, v_zone,
        jsonb_build_array(jsonb_build_object('product_id', v_var_prod, 'quantity', 1)));
      res := res || jsonb_build_object('c', 'variant product without variant_id is rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'variant product without variant_id is rejected',
        'p', sqlerrm = 'VARIANT_REQUIRED', 'd', sqlerrm);
    end;

    begin
      perform public.create_order(v_customer, v_zone,
        jsonb_build_array(jsonb_build_object('product_id', v_oos, 'quantity', 1)));
      res := res || jsonb_build_object('c', 'out-of-stock product is rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'out-of-stock product is rejected',
        'p', sqlerrm = 'OUT_OF_STOCK', 'd', sqlerrm);
    end;

    begin
      perform public.create_order(v_customer, v_zone,
        jsonb_build_array(jsonb_build_object('product_id', v_simple, 'quantity', v_simple_stock + 5)));
      res := res || jsonb_build_object('c', 'quantity above stock is rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'quantity above stock is rejected',
        'p', sqlerrm = 'OUT_OF_STOCK', 'd', sqlerrm);
    end;

    begin
      perform public.create_order(v_customer, v_zone,
        jsonb_build_array(jsonb_build_object('product_id', v_draft, 'quantity', 1)));
      res := res || jsonb_build_object('c', 'inactive product is rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'inactive product is rejected',
        'p', sqlerrm = 'PRODUCT_UNAVAILABLE', 'd', sqlerrm);
    end;

    begin
      perform public.create_order(jsonb_set(v_customer, '{phone}', '"12345"'), v_zone,
        jsonb_build_array(jsonb_build_object('product_id', v_simple, 'quantity', 1)));
      res := res || jsonb_build_object('c', 'invalid phone is rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'invalid phone is rejected',
        'p', sqlerrm = 'INVALID_PHONE', 'd', sqlerrm);
    end;

    -- 4d. custom request
    j := public.submit_custom_request(
      p_customer_name => 'RLS Test Customer',
      p_phone         => '0712345678',
      p_description   => 'A 2.4m walnut dining table for eight.',
      p_budget        => 120000);
    res := res || jsonb_build_object('c', 'anon submit_custom_request works',
      'p', j ->> 'reference' like 'CR-%', 'd', coalesce(j ->> 'reference', 'null'));

    -- 4e. stock was decremented and logged (checked as owner)
    reset role;
    select stock_quantity into n from public.products where id = v_simple;
    res := res || jsonb_build_object('c', 'simple product stock decremented',
      'p', n = v_simple_stock - 1, 'd', v_simple_stock || ' -> ' || n);
    select stock_quantity into n from public.product_variants where id = v_var;
    res := res || jsonb_build_object('c', 'variant stock decremented (not the product)',
      'p', n = v_var_stock - 1, 'd', v_var_stock || ' -> ' || n);
    select count(*) into n from public.inventory_movements m
      join public.orders o on o.id = m.order_id
     where o.order_number = v_order_no and m.reason = 'sale';
    res := res || jsonb_build_object('c', 'sale movements logged', 'p', n = 2, 'd', n || ' movements');

    -- 4f. signed-in user who is NOT an admin
    set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_stranger::text, true);

    select count(*) into n from public.orders;
    res := res || jsonb_build_object('c', 'signed-in non-admin cannot read orders', 'p', n = 0, 'd', n || ' rows');
    select count(*) into n from public.customers;
    res := res || jsonb_build_object('c', 'signed-in non-admin cannot read customers', 'p', n = 0, 'd', n || ' rows');
    update public.products set price = 1;
    get diagnostics n = row_count;
    res := res || jsonb_build_object('c', 'signed-in non-admin cannot update products', 'p', n = 0, 'd', n || ' rows changed');
    begin
      insert into public.admin_users (user_id, role) values (v_stranger, 'owner');
      res := res || jsonb_build_object('c', 'non-admin cannot make themself admin', 'p', false, 'd', 'insert succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'non-admin cannot make themself admin', 'p', sqlstate in ('42501', '23503'), 'd', sqlerrm);
    end;

    -- 4g. admin cancels the order: stock goes back to the same variant
    reset role;
    insert into auth.users (id, email, aud, role)
      values (v_admin, 'rls-test-admin@example.invalid', 'authenticated', 'authenticated');
    insert into public.admin_users (user_id, role) values (v_admin, 'owner');

    set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_admin::text, true);

    select count(*) into n from public.orders where order_number = v_order_no;
    res := res || jsonb_build_object('c', 'admin can read orders', 'p', n = 1, 'd', n || ' rows');
    select count(*) into n from public.customers;
    res := res || jsonb_build_object('c', 'admin can read customers', 'p', n > 0, 'd', n || ' rows');

    n := public.adjust_stock(v_simple, null, 3, 'restock', 'RLS test restock');
    res := res || jsonb_build_object('c', 'admin adjust_stock restocks', 'p', n = v_simple_stock - 1 + 3, 'd', 'new stock ' || n);
    n := public.adjust_stock(v_simple, null, -3, 'adjustment', 'RLS test undo');

    update public.orders set status = 'cancelled' where order_number = v_order_no;
    get diagnostics n = row_count;
    res := res || jsonb_build_object('c', 'admin can cancel an order', 'p', n = 1, 'd', n || ' rows');

    reset role;
    select stock_quantity into n from public.products where id = v_simple;
    res := res || jsonb_build_object('c', 'cancel restores simple product stock',
      'p', n = v_simple_stock, 'd', 'now ' || n || ', expected ' || v_simple_stock);
    select stock_quantity into n from public.product_variants where id = v_var;
    res := res || jsonb_build_object('c', 'cancel restores stock to the same variant',
      'p', n = v_var_stock, 'd', 'now ' || n || ', expected ' || v_var_stock);
    select count(*) into n from public.inventory_movements m
      join public.orders o on o.id = m.order_id
     where o.order_number = v_order_no and m.reason = 'cancelled_order';
    res := res || jsonb_build_object('c', 'cancellation movements logged', 'p', n = 2, 'd', n || ' movements');

    begin
      update public.orders set status = 'pending' where order_number = v_order_no;
      res := res || jsonb_build_object('c', 'cancelled order cannot be re-opened', 'p', false, 'd', 'update succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'cancelled order cannot be re-opened',
        'p', sqlerrm = 'ORDER_CANCELLED_FINAL', 'd', sqlerrm);
    end;

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'RPC flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into rls_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd'
  from jsonb_array_elements(res) e;
end
$test$;

select n,
       case when pass then 'PASS' else 'FAIL' end as result,
       check_name,
       detail
from rls_results
order by pass, n;
