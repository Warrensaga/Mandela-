-- =============================================================================
-- Unconfirmed orders release their stock (audit B2, 2026-11-16).
--
-- create_order takes stock as soon as an order is placed. An order nobody
-- confirms (a customer who never sends the WhatsApp message, or a fake order)
-- used to hold that stock until someone cancelled it by hand.
--
-- Every 15 minutes, orders still 'pending' and 'unpaid' after the hold time
-- are cancelled. The existing cancel trigger returns their stock and logs it.
-- Confirming an order, or recording any payment, stops the clock.
--
-- Hold time: settings key order_hold_hours (public, shown at checkout
-- confirmation). Default 48. 0 turns auto-cancel off. Capped at 720 (30 days).
-- =============================================================================

create extension if not exists pg_cron;

insert into public.settings (key, value, is_public)
values ('order_hold_hours', '48'::jsonb, true)
on conflict (key) do nothing;

create or replace function private.order_hold_hours()
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select least((s.value #>> '{}')::numeric, 720)
       from public.settings s
      where s.key = 'order_hold_hours'
        and (s.value #>> '{}') ~ '^\d{1,4}(\.\d+)?$'),
    48);
$$;

create or replace function private.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours numeric := private.order_hold_hours();
  v_count integer;
begin
  if v_hours <= 0 then
    return 0;
  end if;

  update public.orders o
     set status = 'cancelled',
         internal_notes = concat_ws(E'\n', nullif(o.internal_notes, ''),
           format('Auto-cancelled %s: not confirmed or paid within %s hours. Stock returned.',
                  to_char(now() at time zone 'Africa/Nairobi', 'DD Mon YYYY HH24:MI'),
                  trim_scale(v_hours)))
   where o.status = 'pending'
     and o.payment_status = 'unpaid'
     and o.created_at < now() - v_hours * interval '1 hour';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.order_hold_hours() from public, anon, authenticated;
revoke all on function private.expire_pending_orders() from public, anon, authenticated;

-- cron.schedule with a job name replaces an existing job of that name.
select cron.schedule('expire-pending-orders', '*/15 * * * *', 'select private.expire_pending_orders()');
