-- =============================================================================
-- Permanently delete products (owner only)
--
-- Used to clear demo products before adding the real catalogue, and to remove
-- products for good. Deactivating (is_active = false) is still the gentle
-- option; deleting cannot be undone.
--
-- Past orders stay intact: every order line keeps its own snapshot of the
-- product name, variant label, SKU and price, so the link to a deleted
-- product or variant is simply cleared (set to NULL) instead of blocking the
-- delete. Images, options, variants and stock history of the product go with it.
-- =============================================================================

alter table public.order_items alter column product_id drop not null;

alter table public.order_items drop constraint order_items_product_id_fkey;
alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;

alter table public.order_items drop constraint order_items_variant_id_fkey;
alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants (id) on delete set null;

-- Returns {"deleted": n, "names": [...], "image_urls": [...]}. The admin app
-- removes the returned image files from storage afterwards.
create or replace function public.admin_delete_products(p_product_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_names  jsonb;
  v_images jsonb;
  v_count  integer;
begin
  if not public.is_owner() then
    raise exception using errcode = '42501', message = 'NOT_AUTHORIZED';
  end if;
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    return jsonb_build_object('deleted', 0, 'names', '[]'::jsonb, 'image_urls', '[]'::jsonb);
  end if;
  if cardinality(p_product_ids) > 500 then
    raise exception using errcode = 'P0001', message = 'TOO_MANY_ITEMS';
  end if;

  select coalesce(jsonb_agg(name order by name), '[]'::jsonb) into v_names
  from public.products where id = any (p_product_ids);
  select coalesce(jsonb_agg(url), '[]'::jsonb) into v_images
  from public.product_images where product_id = any (p_product_ids);

  delete from public.products where id = any (p_product_ids);
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return jsonb_build_object('deleted', v_count, 'names', v_names, 'image_urls', v_images);
end;
$$;

revoke all on function public.admin_delete_products(uuid[]) from public, anon;
grant execute on function public.admin_delete_products(uuid[]) to authenticated;
