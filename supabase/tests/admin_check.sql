-- =============================================================================
-- Phase 3 admin functions check. Run after all migrations and seed.sql.
-- Impersonates an admin; everything is rolled back. Every row must be PASS.
-- =============================================================================

drop table if exists admin_results;
create temp table admin_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res        jsonb := '[]'::jsonb;
  j          jsonb;
  n          integer;
  v_admin    uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_sofa     uuid;
  v_zone     uuid;
  v_var      uuid;
  v_req      uuid;
  v_ids      uuid[];
  v_opts     jsonb;
begin
  select id into v_sofa from public.products where slug = 'amani-sofa';
  select id into v_zone from public.delivery_zones where name = 'Nairobi Core';

  -- anon cannot call admin functions
  set local role anon;
  begin
    perform public.admin_dashboard();
    res := res || jsonb_build_object('c', 'anon cannot call admin_dashboard', 'p', false, 'd', 'call succeeded');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot call admin_dashboard', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;
  begin
    execute 'select count(*) from public.admin_inventory' into n;
    res := res || jsonb_build_object('c', 'anon cannot read admin_inventory', 'p', false, 'd', n || ' rows');
  exception when others then
    res := res || jsonb_build_object('c', 'anon cannot read admin_inventory', 'p', sqlstate = '42501', 'd', sqlerrm);
  end;

  begin
    -- signed-in non-admin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_stranger::text, true);
    begin
      perform public.admin_dashboard();
      res := res || jsonb_build_object('c', 'non-admin cannot call admin_dashboard', 'p', false, 'd', 'call succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'non-admin cannot call admin_dashboard', 'p', sqlerrm = 'NOT_AUTHORIZED', 'd', sqlerrm);
    end;
    select count(*) into n from public.admin_customer_stats;
    res := res || jsonb_build_object('c', 'non-admin sees no customer stats', 'p', n = 0, 'd', n || ' rows');

    -- become admin
    reset role;
    insert into auth.users (id, email, aud, role) values (v_admin, 'admin-test@example.invalid', 'authenticated', 'authenticated');
    insert into public.admin_users (user_id, role) values (v_admin, 'staff');
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_admin::text, true);

    j := public.admin_dashboard();
    res := res || jsonb_build_object('c', 'admin_dashboard returns all sections',
      'p', j ?& array['today', 'week', 'month', 'pending_orders', 'stock_alerts', 'recent_orders', 'top_sellers', 'new_custom_requests'],
      'd', 'out of stock: ' || (j ->> 'out_of_stock_count') || ', low: ' || (j ->> 'low_stock_count'));

    select count(*) into n from public.admin_inventory;
    res := res || jsonb_build_object('c', 'admin_inventory has a row per variant and simple product',
      'p', n = (select count(*) from public.product_variants) + (select count(*) from public.products where not has_variants),
      'd', n || ' rows');

    -- reorder categories (reverse the top level)
    select array_agg(id order by sort_order desc) into v_ids from public.categories where parent_id is null;
    perform public.admin_set_sort_order('categories', v_ids);
    select count(*) into n from public.categories c
      where c.parent_id is null and c.sort_order = array_position(v_ids, c.id);
    res := res || jsonb_build_object('c', 'admin_set_sort_order reorders', 'p', n = cardinality(v_ids), 'd', n || ' updated');
    begin
      perform public.admin_set_sort_order('orders', v_ids);
      res := res || jsonb_build_object('c', 'admin_set_sort_order rejects other tables', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'admin_set_sort_order rejects other tables', 'p', sqlerrm = 'INVALID_TABLE', 'd', sqlerrm);
    end;

    -- order a Grey variant so it has history
    reset role;
    select id into v_var from public.product_variants
     where product_id = v_sofa and option_values ->> 'Colour' = 'Grey' and option_values ->> 'Size' = '3-Seater'
       and option_values ->> 'Fabric' = 'Chenille';
    perform public.create_order(
      '{"full_name":"Admin Test","phone":"0711000222","address":"x","city":"Nairobi"}', v_zone,
      jsonb_build_array(jsonb_build_object('product_id', v_sofa, 'variant_id', v_var, 'quantity', 1)));
    set local role authenticated;

    -- rename Grey -> Charcoal
    select jsonb_agg(jsonb_build_object('name', name, 'values',
             case when name = 'Colour' then to_jsonb(array['Charcoal', 'Navy', 'Beige']) else to_jsonb("values") end)
           order by sort_order)
      into v_opts from public.product_options where product_id = v_sofa;
    j := public.admin_set_product_options(v_sofa, v_opts, '{"values": {"Colour": {"Grey": "Charcoal"}}}');
    select count(*) into n from public.product_variants where product_id = v_sofa and option_values ->> 'Colour' = 'Charcoal';
    res := res || jsonb_build_object('c', 'renaming a value rewrites its variants', 'p', (j ->> 'renamed')::int = 9 and n = 9, 'd', j::text);
    select count(*) into n from public.product_variants where id = v_var and option_values ->> 'Colour' = 'Charcoal' and is_active;
    res := res || jsonb_build_object('c', 'renamed variant with order history stays active', 'p', n = 1, 'd', n || ' rows');

    -- remove Charcoal: 8 variants without history deleted, 1 with history deactivated
    v_opts := (select jsonb_agg(jsonb_build_object('name', name, 'values',
                 case when name = 'Colour' then to_jsonb(array['Navy', 'Beige']) else to_jsonb("values") end) order by sort_order)
               from public.product_options where product_id = v_sofa);
    j := public.admin_set_product_options(v_sofa, v_opts, '{}');
    res := res || jsonb_build_object('c', 'removing a value deletes unused variants, deactivates sold ones',
      'p', (j ->> 'deleted')::int = 8 and (j ->> 'deactivated')::int = 1, 'd', j::text);
    select count(*) into n from public.product_variants where id = v_var and not is_active;
    res := res || jsonb_build_object('c', 'variant with order history is kept (inactive)', 'p', n = 1, 'd', n || ' rows');

    -- add Olive and generate
    v_opts := (select jsonb_agg(jsonb_build_object('name', name, 'values',
                 case when name = 'Colour' then to_jsonb(array['Navy', 'Beige', 'Olive']) else to_jsonb("values") end) order by sort_order)
               from public.product_options where product_id = v_sofa);
    perform public.admin_set_product_options(v_sofa, v_opts, '{}');
    n := public.admin_generate_variants(v_sofa);
    res := res || jsonb_build_object('c', 'generate creates the missing combinations', 'p', n = 9, 'd', n || ' created');
    n := public.admin_generate_variants(v_sofa);
    res := res || jsonb_build_object('c', 'generate again creates nothing', 'p', n = 0, 'd', n || ' created');

    -- invalid options rejected
    begin
      perform public.admin_set_product_options(v_sofa, '[{"name":"Size","values":["A","A"]}]', '{}');
      res := res || jsonb_build_object('c', 'duplicate option values rejected', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'duplicate option values rejected', 'p', sqlerrm = 'INVALID_OPTIONS', 'd', sqlerrm);
    end;

    -- usage report
    j := public.admin_option_usage(v_sofa);
    res := res || jsonb_build_object('c', 'admin_option_usage reports ordered lines',
      'p', exists (select 1 from jsonb_array_elements(j) e where e ->> 'value' = 'Charcoal' and (e ->> 'ordered_lines')::int = 1),
      'd', jsonb_array_length(j) || ' entries');

    -- custom request -> order
    reset role;
    perform public.submit_custom_request('Admin Test', '0711000333', 'A walnut desk with two drawers, 140cm.');
    select id into v_req from public.custom_requests where phone = '+254711000333' order by created_at desc limit 1;
    set local role authenticated;
    begin
      perform public.admin_convert_custom_request(v_req, v_zone, 'Walnut desk', '1 Test Rd', 'Nairobi');
      res := res || jsonb_build_object('c', 'convert needs a quoted price', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'convert needs a quoted price', 'p', sqlerrm = 'QUOTE_REQUIRED', 'd', sqlerrm);
    end;
    update public.custom_requests set quoted_price = 60000, status = 'quoted' where id = v_req;
    j := public.admin_convert_custom_request(v_req, v_zone, 'Walnut desk', '1 Test Rd', 'Nairobi');
    select jsonb_build_object('total', o.total, 'deposit', o.deposit_amount, 'balance', o.balance_due, 'status', o.status,
                              'items', (select count(*) from public.order_items where order_id = o.id))
      into j from public.orders o where o.order_number = j ->> 'order_number';
    res := res || jsonb_build_object('c', 'custom request converts to an order with 50% deposit',
      'p', (j ->> 'total')::numeric = 61000 and (j ->> 'deposit')::numeric = 30500 and (j ->> 'items')::int = 1, 'd', j::text);
    select count(*) into n from public.custom_requests where id = v_req and status = 'accepted';
    res := res || jsonb_build_object('c', 'converted request is marked accepted', 'p', n = 1, 'd', n || ' rows');
    begin
      perform public.admin_convert_custom_request(v_req, v_zone, 'Walnut desk', '1 Test Rd', 'Nairobi');
      res := res || jsonb_build_object('c', 'a request converts only once', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'a request converts only once', 'p', sqlerrm = 'ALREADY_CONVERTED', 'd', sqlerrm);
    end;

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'admin flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into admin_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd' from jsonb_array_elements(res) e;
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, detail
from admin_results
order by pass, n;
