-- =============================================================================
-- Stock, the stock log and order money can only change through the database's
-- own functions (audit D3, 2026-11-16).
--
-- Before: the admin RLS policies let any signed-in admin call the REST API
-- directly and set stock with nothing logged, write stock-log rows that change
-- no stock, add order lines, or change an order's total after it was placed.
-- The admin screens never did this, but one browser-console call could.
--
-- After:
-- * stock_quantity changes only inside create_order, adjust_stock and the
--   cancel trigger (all SECURITY DEFINER). New products and variants start at 0.
-- * inventory_movements, orders and order_items cannot be inserted or edited
--   through the API. Orders are created by create_order and by
--   admin_convert_custom_request (now SECURITY DEFINER with its admin check).
-- * An order's number, customer, zone, subtotal, delivery fee, total and
--   creation time are fixed once placed. Status, payment status and method,
--   deposit, balance, delivery date and internal notes stay editable.
--
-- The guards apply to API callers (roles anon and authenticated). The
-- database's own functions and the Supabase dashboard (postgres /
-- service_role) are unaffected.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Stock column guard (products and product_variants)
-- -----------------------------------------------------------------------------
create or replace function public.guard_stock_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.stock_quantity <> 0 then
      raise exception using errcode = 'P0001', message = 'STOCK_LOCKED',
        detail = 'New items start with 0 in stock. Add stock with Restock so the change is logged.';
    elsif tg_op = 'UPDATE' and new.stock_quantity is distinct from old.stock_quantity then
      raise exception using errcode = 'P0001', message = 'STOCK_LOCKED',
        detail = 'Stock changes only through Adjust or Restock, so every change is logged.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_stock_quantity() from public, anon, authenticated;

create trigger products_guard_stock
  before insert or update of stock_quantity on public.products
  for each row execute function public.guard_stock_quantity();

create trigger product_variants_guard_stock
  before insert or update of stock_quantity on public.product_variants
  for each row execute function public.guard_stock_quantity();

-- -----------------------------------------------------------------------------
-- Stock log: written only by the database functions
-- -----------------------------------------------------------------------------
drop policy if exists "inventory_movements: admin insert" on public.inventory_movements;
revoke insert, update, delete on public.inventory_movements from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Orders and order lines: created only by create_order and
-- admin_convert_custom_request; lines are never edited afterwards.
-- -----------------------------------------------------------------------------
drop policy if exists "orders: admin insert" on public.orders;
revoke insert, delete on public.orders from anon, authenticated;

drop policy if exists "order_items: admin insert" on public.order_items;
drop policy if exists "order_items: admin update" on public.order_items;
revoke insert, update, delete on public.order_items from anon, authenticated;

create or replace function public.orders_guard_fixed_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and (
       new.order_number      is distinct from old.order_number
    or new.customer_id       is distinct from old.customer_id
    or new.custom_request_id is distinct from old.custom_request_id
    or new.delivery_zone_id  is distinct from old.delivery_zone_id
    or new.subtotal          is distinct from old.subtotal
    or new.delivery_fee      is distinct from old.delivery_fee
    or new.total             is distinct from old.total
    or new.created_at        is distinct from old.created_at
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_FIELDS_LOCKED',
      detail = 'An order''s items, customer, delivery zone and totals are fixed once it is placed. Cancel it and place a new order instead.';
  end if;
  return new;
end;
$$;

revoke all on function public.orders_guard_fixed_fields() from public, anon, authenticated;

create trigger orders_guard_fixed_fields
  before update on public.orders
  for each row execute function public.orders_guard_fixed_fields();

-- A deposit or balance can never be more than the order total.
alter table public.orders
  add constraint orders_deposit_within_total check (deposit_amount <= total),
  add constraint orders_balance_within_total check (balance_due <= total);

-- -----------------------------------------------------------------------------
-- Convert a custom request: now runs as its owner (it inserts the order and
-- its line, which API callers no longer can). Admin check unchanged.
-- -----------------------------------------------------------------------------
alter function public.admin_convert_custom_request(uuid, uuid, text, text, text) security definer;
revoke all on function public.admin_convert_custom_request(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.admin_convert_custom_request(uuid, uuid, text, text, text) to authenticated;
