-- Public "Best sellers" ranking for the home page.
-- Returns only product ids, ranked by units sold in confirmed (or later) orders
-- over the last p_days. No quantities, totals or order data leave the database,
-- so nothing about sales volume is shown to visitors. Pending and cancelled
-- orders do not count; inactive products are left out.
create or replace function public.get_best_sellers(p_days integer default 90, p_limit integer default 8)
returns table (product_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.status in ('confirmed', 'processing', 'out_for_delivery', 'delivered')
    and o.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 90), 1), 365))
    and p.is_active
  group by oi.product_id
  order by sum(oi.quantity) desc, max(o.created_at) desc
  limit least(greatest(coalesce(p_limit, 8), 1), 12);
$$;

revoke all on function public.get_best_sellers(integer, integer) from public;
grant execute on function public.get_best_sellers(integer, integer) to anon, authenticated;
