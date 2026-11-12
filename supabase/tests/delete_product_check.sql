-- =============================================================================
-- admin_delete_products check. Everything is rolled back. Every row must be PASS.
-- =============================================================================

drop table if exists delete_product_results;
create temp table delete_product_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res      jsonb := '[]'::jsonb;
  j        jsonb;
  n        integer;
  v_owner  uuid := gen_random_uuid();
  v_staff  uuid := gen_random_uuid();
  v_zone   uuid;
  v_simple uuid;
  v_varp   uuid;
  v_var    uuid;
  v_order  uuid;
begin
  select id into v_zone from public.delivery_zones where is_active order by sort_order limit 1;
  select id into v_simple from public.products where is_active and not has_variants and not is_made_to_order and stock_quantity > 0 limit 1;
  select v.product_id, v.id into v_varp, v_var from public.product_variants v
    join public.products p on p.id = v.product_id
   where v.is_active and v.stock_quantity > 0 and p.is_active and not p.is_made_to_order limit 1;

  begin
    j := public.create_order('{"full_name":"Delete Product Test","phone":"0711000888","address":"x","city":"Nairobi"}', v_zone,
           jsonb_build_array(jsonb_build_object('product_id', v_simple, 'quantity', 1),
                             jsonb_build_object('product_id', v_varp, 'variant_id', v_var, 'quantity', 1)));
    select id into v_order from public.orders where order_number = j ->> 'order_number';

    insert into auth.users (id, email, aud, role) values
      (v_owner, 'owner-dp@example.invalid', 'authenticated', 'authenticated'),
      (v_staff, 'staff-dp@example.invalid', 'authenticated', 'authenticated');
    insert into public.admin_users (user_id, role) values (v_owner, 'owner'), (v_staff, 'staff');

    set local role anon;
    begin
      perform public.admin_delete_products(array[v_simple]);
      res := res || jsonb_build_object('c', 'anon cannot delete products', 'p', false, 'd', 'deleted');
    exception when others then
      res := res || jsonb_build_object('c', 'anon cannot delete products', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;

    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    begin
      perform public.admin_delete_products(array[v_simple]);
      res := res || jsonb_build_object('c', 'staff cannot delete products', 'p', false, 'd', 'deleted');
    exception when others then
      res := res || jsonb_build_object('c', 'staff cannot delete products', 'p', sqlerrm = 'NOT_AUTHORIZED', 'd', sqlerrm);
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    j := public.admin_delete_products(array[v_simple, v_varp]);
    res := res || jsonb_build_object('c', 'owner deletes two products that have orders', 'p', (j ->> 'deleted')::int = 2, 'd', j::text);
    res := res || jsonb_build_object('c', 'image URLs are returned for storage cleanup',
      'p', jsonb_typeof(j -> 'image_urls') = 'array', 'd', jsonb_array_length(j -> 'image_urls') || ' urls');

    reset role;
    select count(*) into n from public.products where id in (v_simple, v_varp);
    res := res || jsonb_build_object('c', 'products are gone', 'p', n = 0, 'd', n || ' rows');
    select count(*) into n from public.product_variants where product_id = v_varp;
    res := res || jsonb_build_object('c', 'their variants are gone', 'p', n = 0, 'd', n || ' rows');
    select count(*) into n from public.product_images where product_id in (v_simple, v_varp);
    res := res || jsonb_build_object('c', 'their image rows are gone', 'p', n = 0, 'd', n || ' rows');
    select count(*) into n from public.order_items
     where order_id = v_order and product_id is null and variant_id is null and product_name_snapshot is not null and line_total > 0;
    res := res || jsonb_build_object('c', 'the order keeps both lines with their snapshots', 'p', n = 2, 'd', n || ' lines');
    select count(*) into n from public.orders where id = v_order and total > 0;
    res := res || jsonb_build_object('c', 'the order and its total are kept', 'p', n = 1, 'd', n || ' rows');

    -- cancelling that order afterwards still works (no stock to restore)
    update public.orders set status = 'cancelled' where id = v_order;
    res := res || jsonb_build_object('c', 'an order with deleted products can still be cancelled', 'p', true, 'd', 'ok');

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'delete flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into delete_product_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd' from jsonb_array_elements(res) e;
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, detail
from delete_product_results
order by pass, n;
