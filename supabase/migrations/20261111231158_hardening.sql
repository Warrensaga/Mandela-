-- =============================================================================
-- Follow-ups from the Supabase security/performance advisors after Phase 1.
-- =============================================================================

-- Covering indexes for foreign keys (advisor: unindexed_foreign_keys)
create index if not exists inventory_movements_created_by_idx on public.inventory_movements (created_by);
create index if not exists orders_custom_request_idx         on public.orders (custom_request_id);
create index if not exists orders_delivery_zone_idx          on public.orders (delivery_zone_id);
create index if not exists product_variants_image_idx        on public.product_variants (image_id);

-- Role helpers are only used by policies that target `authenticated`, so the
-- anon role never needs to call them (advisor: anon_security_definer_function_executable).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;
