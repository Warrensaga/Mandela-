-- =============================================================================
-- Security hardening check (migration 20261112000900). Run after all
-- migrations and seed.sql. Everything is rolled back. Every row must be PASS.
-- =============================================================================

drop table if exists security_results;
create temp table security_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res     jsonb := '[]'::jsonb;
  j       jsonb;
  n       integer;
  i       integer;
  v_zone  uuid;
  v_prod  uuid;
  v_no    text;
  v_err   text;
  v_items jsonb;
  c_cust  constant text := '{"full_name":"Real Customer","phone":"0711000444","email":"real@example.com","address":"Real road","city":"Nairobi"}';
begin
  select id into v_zone from public.delivery_zones where is_active order by sort_order limit 1;
  select id into v_prod from public.products
   where is_active and not has_variants and not is_made_to_order
   order by stock_quantity desc limit 1;
  v_items := jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1));

  begin
    update public.products set stock_quantity = 1000 where id = v_prod;
    perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.9"}', true);
    set local role anon;

    -- private schema is closed
    begin
      select count(*) into n from private.rate_limits;
      res := res || jsonb_build_object('c', 'anon cannot read rate_limits', 'p', false, 'd', n || ' rows');
    exception when others then
      res := res || jsonb_build_object('c', 'anon cannot read rate_limits', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;
    begin
      perform private.hit_rate_limit('x', 'y', 1, interval '1 hour');
      res := res || jsonb_build_object('c', 'anon cannot call hit_rate_limit', 'p', false, 'd', 'called');
    exception when others then
      res := res || jsonb_build_object('c', 'anon cannot call hit_rate_limit', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;

    -- order: first order creates the customer
    j := public.create_order(c_cust::jsonb, v_zone, v_items);
    v_no := j ->> 'order_number';

    -- someone else reuses the phone with a different name and email
    j := public.create_order('{"full_name":"Attacker","phone":"0711000444","email":"evil@example.com","address":"Fake","city":"Fake"}'::jsonb, v_zone, v_items);
    reset role;
    select count(*) into n from public.customers
     where phone = '+254711000444' and full_name = 'Real Customer' and email = 'real@example.com' and address = 'Real road';
    res := res || jsonb_build_object('c', 'anonymous order cannot overwrite a stored customer', 'p', n = 1, 'd', n || ' rows');
    select count(*) into n from public.orders where order_number = j ->> 'order_number' and delivery_address = 'Fake';
    res := res || jsonb_build_object('c', 'the order keeps its own delivery address', 'p', n = 1, 'd', n || ' rows');

    -- per-phone limit: 5 per hour (2 used above)
    set local role anon;
    for i in 1..3 loop
      perform public.create_order(c_cust::jsonb, v_zone, v_items);
    end loop;
    begin
      perform public.create_order(c_cust::jsonb, v_zone, v_items);
      res := res || jsonb_build_object('c', '6th order from one phone in an hour is refused', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', '6th order from one phone in an hour is refused', 'p', sqlerrm = 'RATE_LIMITED', 'd', sqlerrm);
    end;

    -- per-IP limit: 10 per hour (5 used)
    for i in 1..5 loop
      perform public.create_order(jsonb_build_object('full_name', 'Ip Test', 'phone', '07110005' || lpad(i::text, 2, '0'),
        'address', 'x', 'city', 'Nairobi'), v_zone, v_items);
    end loop;
    begin
      perform public.create_order('{"full_name":"Ip Test","phone":"0711000599","address":"x","city":"Nairobi"}'::jsonb, v_zone, v_items);
      res := res || jsonb_build_object('c', '11th order from one IP in an hour is refused', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', '11th order from one IP in an hour is refused', 'p', sqlerrm = 'RATE_LIMITED', 'd', sqlerrm);
    end;

    -- order tracking: right phone works, 10 wrong guesses lock the order number
    perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.10"}', true);
    res := res || jsonb_build_object('c', 'tracking with the right phone works',
      'p', public.get_order_status(v_no, '0711000444') is not null, 'd', v_no);
    for i in 1..10 loop
      perform public.get_order_status(v_no, '07120000' || lpad(i::text, 2, '0'));
    end loop;
    begin
      perform public.get_order_status(v_no, '0711000444');
      res := res || jsonb_build_object('c', 'order number locks after 10 wrong phones', 'p', false, 'd', 'answered');
    exception when others then
      res := res || jsonb_build_object('c', 'order number locks after 10 wrong phones', 'p', sqlerrm = 'RATE_LIMITED', 'd', sqlerrm);
    end;

    -- custom requests: 3 per phone per hour
    perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.11"}', true);
    for i in 1..3 loop
      perform public.submit_custom_request('Custom Test', '0711000777', 'A dining table for eight people');
    end loop;
    begin
      perform public.submit_custom_request('Custom Test', '0711000777', 'A dining table for eight people');
      res := res || jsonb_build_object('c', '4th custom request from one phone is refused', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', '4th custom request from one phone is refused', 'p', sqlerrm = 'RATE_LIMITED', 'd', sqlerrm);
    end;
    begin
      perform public.submit_custom_request('Custom Test', '0711000778', 'A dining table for eight people',
        p_reference_image_path => 'uploads/../../evil.html');
      res := res || jsonb_build_object('c', 'custom request rejects odd image paths', 'p', false, 'd', 'accepted');
    exception when others then
      res := res || jsonb_build_object('c', 'custom request rejects odd image paths', 'p', sqlerrm = 'INVALID_IMAGE_PATH', 'd', sqlerrm);
    end;

    -- storage: reference uploads
    perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.12"}', true);
    begin
      insert into storage.objects (bucket_id, name) values ('custom-requests', 'uploads/evil.html');
      res := res || jsonb_build_object('c', 'upload with a free-form name is refused', 'p', false, 'd', 'inserted');
    exception when others then
      res := res || jsonb_build_object('c', 'upload with a free-form name is refused', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;
    for i in 1..6 loop
      insert into storage.objects (bucket_id, name) values ('custom-requests', 'uploads/' || gen_random_uuid() || '.jpg');
    end loop;
    res := res || jsonb_build_object('c', 'normal reference uploads work', 'p', true, 'd', '6 uploads');
    begin
      insert into storage.objects (bucket_id, name) values ('custom-requests', 'uploads/' || gen_random_uuid() || '.jpg');
      res := res || jsonb_build_object('c', '7th upload from one IP in an hour is refused', 'p', false, 'd', 'inserted');
    exception when others then
      res := res || jsonb_build_object('c', '7th upload from one IP in an hour is refused', 'p', sqlerrm = 'RATE_LIMITED', 'd', sqlerrm);
    end;

    -- product-images cannot be listed by visitors
    select count(*) into n from storage.objects where bucket_id = 'product-images';
    res := res || jsonb_build_object('c', 'visitors cannot list product-images', 'p', n = 0, 'd', n || ' rows');

    -- views are read-only
    begin
      update public.product_summaries set name = 'x' where false;
      res := res || jsonb_build_object('c', 'views are not writable', 'p', false, 'd', 'updated');
    exception when others then
      res := res || jsonb_build_object('c', 'views are not writable', 'p', sqlstate in ('42501', '55000'), 'd', sqlerrm);
    end;

    reset role;

    -- URL columns
    begin
      update public.hero_slides set cta_url = 'javascript:alert(1)' where id = (select id from public.hero_slides limit 1);
      res := res || jsonb_build_object('c', 'javascript: links are refused', 'p', false, 'd', 'saved');
    exception when others then
      res := res || jsonb_build_object('c', 'javascript: links are refused', 'p', sqlstate = '23514', 'd', sqlerrm);
    end;
    begin
      update public.hero_slides set cta_url = '//evil.example' where id = (select id from public.hero_slides limit 1);
      res := res || jsonb_build_object('c', 'protocol-relative links are refused', 'p', false, 'd', 'saved');
    exception when others then
      res := res || jsonb_build_object('c', 'protocol-relative links are refused', 'p', sqlstate = '23514', 'd', sqlerrm);
    end;

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'security flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into security_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd' from jsonb_array_elements(res) e;
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, detail
from security_results
order by pass, n;
