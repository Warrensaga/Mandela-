-- =============================================================================
-- admin_delete_order check. Run after all migrations and seed.sql.
-- Everything is rolled back. Every row must be PASS.
-- =============================================================================

drop table if exists delete_results;
create temp table delete_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res      jsonb := '[]'::jsonb;
  j        jsonb;
  n        integer;
  v_owner  uuid := gen_random_uuid();
  v_staff  uuid := gen_random_uuid();
  v_zone   uuid;
  v_table  uuid;
  v_stock  integer;
  v_order  uuid;
  v_order2 uuid;
  v_num    text;
begin
  select id into v_zone from public.delivery_zones where name = 'Nairobi Core';
  select id, stock_quantity into v_table, v_stock from public.products where slug = 'kito-coffee-table';

  begin
    j := public.create_order('{"full_name":"Delete Test","phone":"0711000333","address":"x","city":"Nairobi"}', v_zone,
           jsonb_build_array(jsonb_build_object('product_id', v_table, 'quantity', 2)));
    v_num := j ->> 'order_number';
    select id into v_order from public.orders where order_number = v_num;
    j := public.create_order('{"full_name":"Delete Test","phone":"0711000333","address":"x","city":"Nairobi"}', v_zone,
           jsonb_build_array(jsonb_build_object('product_id', v_table, 'quantity', 1)));
    select id into v_order2 from public.orders where order_number = j ->> 'order_number';

    insert into auth.users (id, email, aud, role) values
      (v_owner, 'owner-del@example.invalid', 'authenticated', 'authenticated'),
      (v_staff, 'staff-del@example.invalid', 'authenticated', 'authenticated');
    insert into public.admin_users (user_id, role) values (v_owner, 'owner'), (v_staff, 'staff');

    -- anon cannot delete
    set local role anon;
    begin
      perform public.admin_delete_order(v_order);
      res := res || jsonb_build_object('c', 'anon cannot delete orders', 'p', false, 'd', 'deleted');
    exception when others then
      res := res || jsonb_build_object('c', 'anon cannot delete orders', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;

    -- staff cannot delete
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_staff::text, true);
    begin
      perform public.admin_delete_order(v_order);
      res := res || jsonb_build_object('c', 'staff cannot delete orders', 'p', false, 'd', 'deleted');
    exception when others then
      res := res || jsonb_build_object('c', 'staff cannot delete orders', 'p', sqlerrm = 'NOT_AUTHORIZED', 'd', sqlerrm);
    end;
    begin
      delete from public.orders where id = v_order;
      get diagnostics n = row_count;
      res := res || jsonb_build_object('c', 'direct DELETE on orders does nothing', 'p', n = 0, 'd', n || ' rows');
    exception when others then
      res := res || jsonb_build_object('c', 'direct DELETE on orders does nothing', 'p', true, 'd', sqlerrm);
    end;

    -- owner deletes a pending order: stock comes back
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_owner::text, true);
    res := res || jsonb_build_object('c', 'owner delete returns the order number',
      'p', public.admin_delete_order(v_order) = v_num, 'd', v_num);

    reset role;
    select count(*) into n from public.orders where id = v_order;
    res := res || jsonb_build_object('c', 'order row is gone', 'p', n = 0, 'd', n || ' rows');
    select count(*) into n from public.order_items where order_id = v_order;
    res := res || jsonb_build_object('c', 'its items are gone', 'p', n = 0, 'd', n || ' rows');
    select stock_quantity into n from public.products where id = v_table;
    res := res || jsonb_build_object('c', 'stock of the deleted order is restored',
      'p', n = v_stock - 1, 'd', 'stock ' || n || ', expected ' || (v_stock - 1));
    select count(*) into n from public.inventory_movements
     where reason = 'cancelled_order' and note like '%' || v_num || '%' and change_quantity = 2;
    res := res || jsonb_build_object('c', 'a restock movement is logged', 'p', n = 1, 'd', n || ' rows');
    select count(*) into n from public.customers where phone = '+254711000333';
    res := res || jsonb_build_object('c', 'the customer is kept', 'p', n = 1, 'd', n || ' rows');

    -- delivered order: no stock change
    update public.orders set status = 'delivered' where id = v_order2;
    set local role authenticated;
    perform public.admin_delete_order(v_order2);
    reset role;
    select stock_quantity into n from public.products where id = v_table;
    res := res || jsonb_build_object('c', 'deleting a delivered order leaves stock alone',
      'p', n = v_stock - 1, 'd', 'stock ' || n);

    set local role authenticated;
    begin
      perform public.admin_delete_order(v_order2);
      res := res || jsonb_build_object('c', 'deleting a missing order fails cleanly', 'p', false, 'd', 'deleted');
    exception when others then
      res := res || jsonb_build_object('c', 'deleting a missing order fails cleanly', 'p', sqlerrm = 'NOT_FOUND', 'd', sqlerrm);
    end;

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'delete flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into delete_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd' from jsonb_array_elements(res) e;
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, detail
from delete_results
order by pass, n;
