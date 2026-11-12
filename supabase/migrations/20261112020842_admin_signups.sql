-- =============================================================================
-- Admin sign-up with owner approval
--
-- Anyone may create an account at /admin/signup, but an account has no admin
-- access until the owner approves it on the Team page. Every new auth user gets
-- a 'pending' access request automatically (trigger on auth.users).
-- Unapproved accounts see exactly what anonymous visitors see (RLS unchanged).
-- =============================================================================

create type public.access_request_status as enum ('pending', 'approved', 'declined');

create table public.admin_access_requests (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  status       public.access_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references auth.users (id) on delete set null
);

create index admin_access_requests_status_idx on public.admin_access_requests (status, requested_at desc);

alter table public.admin_access_requests enable row level security;

revoke all on public.admin_access_requests from anon;
revoke all on public.admin_access_requests from authenticated;
grant select on public.admin_access_requests to authenticated;

-- Applicants can see their own request (to show "waiting for approval").
create policy "access_requests: read own"
  on public.admin_access_requests for select to authenticated
  using (user_id = (select auth.uid()));

-- The owner sees everyone. Changes go through admin_decide_access() only.
create policy "access_requests: owner reads all"
  on public.admin_access_requests for select to authenticated
  using ((select public.is_owner()));

-- -----------------------------------------------------------------------------
-- New auth user -> pending request
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_access_requests (user_id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created_access_request
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill accounts that already exist. Existing admins are marked approved.
insert into public.admin_access_requests (user_id, email, full_name, status, decided_at)
select u.id, u.email,
       nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
       case when a.user_id is not null then 'approved'::public.access_request_status else 'pending' end,
       case when a.user_id is not null then now() end
from auth.users u
left join public.admin_users a on a.user_id = u.id
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- Owner decides: approve (as staff or owner) or decline
-- -----------------------------------------------------------------------------
create or replace function public.admin_decide_access(
  p_user_id uuid,
  p_approve boolean,
  p_role    public.admin_role default 'staff'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  if p_user_id = auth.uid() then
    raise exception using errcode = 'P0001', message = 'CANNOT_CHANGE_SELF';
  end if;
  if not exists (select 1 from public.admin_access_requests where user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  if p_approve then
    insert into public.admin_users (user_id, role) values (p_user_id, coalesce(p_role, 'staff'))
    on conflict (user_id) do update set role = excluded.role;
  else
    delete from public.admin_users where user_id = p_user_id;
  end if;

  update public.admin_access_requests
     set status = case when p_approve then 'approved'::public.access_request_status else 'declined' end,
         decided_at = now(),
         decided_by = auth.uid()
   where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_decide_access(uuid, boolean, public.admin_role) from public, anon;
grant execute on function public.admin_decide_access(uuid, boolean, public.admin_role) to authenticated;
