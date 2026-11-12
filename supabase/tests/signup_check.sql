-- =============================================================================
-- Admin sign-up / owner approval check. Run after all migrations.
-- Creates throwaway auth users inside a rolled-back block. Every row must be PASS.
-- =============================================================================

drop table if exists signup_results;
create temp table signup_results (n serial primary key, check_name text, pass boolean, detail text);

do $test$
declare
  res       jsonb := '[]'::jsonb;
  n         integer;
  b         boolean;
  v_owner   uuid := gen_random_uuid();
  v_staff   uuid := gen_random_uuid();
  v_new     uuid := gen_random_uuid();
  v_other   uuid := gen_random_uuid();
begin
  begin
    -- Sign-ups (as Supabase Auth would create them)
    insert into auth.users (id, email, aud, role, raw_user_meta_data) values
      (v_owner, 'owner@example.invalid', 'authenticated', 'authenticated', '{"full_name":"Test Owner"}'),
      (v_staff, 'staff@example.invalid', 'authenticated', 'authenticated', '{"full_name":"Test Staff"}'),
      (v_new,   'new@example.invalid',   'authenticated', 'authenticated', '{"full_name":"New Person"}'),
      (v_other, 'other@example.invalid', 'authenticated', 'authenticated', '{}');
    insert into public.admin_users (user_id, role) values (v_owner, 'owner'), (v_staff, 'staff');

    select count(*) into n from public.admin_access_requests
     where user_id = v_new and status = 'pending' and full_name = 'New Person' and email = 'new@example.invalid';
    res := res || jsonb_build_object('c', 'sign-up creates a pending request with name and email', 'p', n = 1, 'd', n || ' rows');

    -- anon
    set local role anon;
    begin
      execute 'select count(*) from public.admin_access_requests' into n;
      res := res || jsonb_build_object('c', 'anon cannot read access requests', 'p', false, 'd', n || ' rows');
    exception when others then
      res := res || jsonb_build_object('c', 'anon cannot read access requests', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;

    -- pending applicant
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_new, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_new::text, true);
    select count(*) into n from public.admin_access_requests;
    res := res || jsonb_build_object('c', 'applicant sees only their own request', 'p', n = 1, 'd', n || ' rows');
    b := public.is_admin();
    res := res || jsonb_build_object('c', 'pending applicant is not an admin', 'p', not b, 'd', b::text);
    select count(*) into n from public.orders;
    res := res || jsonb_build_object('c', 'pending applicant cannot read orders', 'p', n = 0, 'd', n || ' rows');
    begin
      perform public.admin_decide_access(v_new, true, 'owner');
      res := res || jsonb_build_object('c', 'applicant cannot approve themself', 'p', false, 'd', 'call succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'applicant cannot approve themself', 'p', sqlerrm = 'NOT_AUTHORIZED', 'd', sqlerrm);
    end;
    begin
      insert into public.admin_users (user_id, role) values (v_new, 'owner');
      res := res || jsonb_build_object('c', 'applicant cannot insert into admin_users', 'p', false, 'd', 'insert succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'applicant cannot insert into admin_users', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;
    begin
      update public.admin_access_requests set status = 'approved' where user_id = v_new;
      get diagnostics n = row_count;
      res := res || jsonb_build_object('c', 'applicant cannot edit their request', 'p', n = 0, 'd', n || ' rows changed');
    exception when others then
      res := res || jsonb_build_object('c', 'applicant cannot edit their request', 'p', sqlstate = '42501', 'd', sqlerrm);
    end;

    -- staff
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_staff::text, true);
    select count(*) into n from public.admin_access_requests;
    res := res || jsonb_build_object('c', 'staff see only their own request', 'p', n = 1, 'd', n || ' rows');
    begin
      perform public.admin_decide_access(v_new, true, 'staff');
      res := res || jsonb_build_object('c', 'staff cannot approve sign-ups', 'p', false, 'd', 'call succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'staff cannot approve sign-ups', 'p', sqlerrm = 'NOT_AUTHORIZED', 'd', sqlerrm);
    end;

    -- owner
    perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_owner::text, true);
    select count(*) into n from public.admin_access_requests where user_id in (v_owner, v_staff, v_new, v_other);
    res := res || jsonb_build_object('c', 'owner sees all requests', 'p', n = 4, 'd', n || ' rows');

    perform public.admin_decide_access(v_new, true, 'staff');
    select count(*) into n from public.admin_users where user_id = v_new and role = 'staff';
    res := res || jsonb_build_object('c', 'owner approval grants staff access', 'p', n = 1, 'd', n || ' rows');
    select count(*) into n from public.admin_access_requests where user_id = v_new and status = 'approved' and decided_by = v_owner;
    res := res || jsonb_build_object('c', 'approval is recorded with who decided', 'p', n = 1, 'd', n || ' rows');

    perform public.admin_decide_access(v_new, true, 'owner');
    select count(*) into n from public.admin_users where user_id = v_new and role = 'owner';
    res := res || jsonb_build_object('c', 'owner can change a role', 'p', n = 1, 'd', n || ' rows');

    perform public.admin_decide_access(v_new, false);
    select count(*) into n from public.admin_users where user_id = v_new;
    res := res || jsonb_build_object('c', 'declining removes admin access', 'p', n = 0, 'd', n || ' rows');

    perform public.admin_decide_access(v_other, false);
    select count(*) into n from public.admin_access_requests where user_id = v_other and status = 'declined';
    res := res || jsonb_build_object('c', 'owner can decline a pending request', 'p', n = 1, 'd', n || ' rows');

    begin
      perform public.admin_decide_access(v_owner, false);
      res := res || jsonb_build_object('c', 'owner cannot remove themself', 'p', false, 'd', 'call succeeded');
    exception when others then
      res := res || jsonb_build_object('c', 'owner cannot remove themself', 'p', sqlerrm = 'CANNOT_CHANGE_SELF', 'd', sqlerrm);
    end;

    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      res := res || jsonb_build_object('c', 'sign-up flow ran without unexpected errors', 'p', false, 'd', sqlerrm);
    end if;
  end;

  reset role;
  insert into signup_results (check_name, pass, detail)
  select e ->> 'c', (e ->> 'p')::boolean, e ->> 'd' from jsonb_array_elements(res) e;
end
$test$;

select n, case when pass then 'PASS' else 'FAIL' end as result, check_name, detail
from signup_results
order by pass, n;
