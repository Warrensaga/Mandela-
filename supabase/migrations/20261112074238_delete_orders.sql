-- Owner can permanently delete an order (for example a test, duplicate or spam order).
--
-- * Stock comes back first for orders that still hold it (anything not yet
--   cancelled or delivered): the order is cancelled, so the existing cancel
--   trigger restores stock per product/variant and logs the movement.
-- * Delivered orders keep their stock as is (the goods have left the shop).
-- * order_items go with the order (on delete cascade); inventory_movements keep
--   their history with order_id set to null (their notes name the order).
-- * The customer record stays, with its other orders.

create or replace function public.admin_delete_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  if not public.is_owner() then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  if o.status not in ('cancelled', 'delivered') then
    update public.orders set status = 'cancelled' where id = o.id;
  end if;

  delete from public.orders where id = o.id;
  return o.order_number;
end;
$$;

revoke all on function public.admin_delete_order(uuid) from public, anon;
grant execute on function public.admin_delete_order(uuid) to authenticated;
