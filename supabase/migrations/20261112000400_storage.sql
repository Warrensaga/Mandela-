-- =============================================================================
-- Mandela Heritage Furniture: storage buckets and policies
--
-- product-images  public read, admin write. Holds all public site media:
--                 products/, categories/, hero/, guides/ folders.
-- custom-requests private. Anonymous visitors may UPLOAD reference images into
--                 uploads/ only; they can never list, read, replace or delete.
--                 Admins read via signed URLs.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('custom-requests', 'custom-requests', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- product-images ---------------------------------------------------------------
create policy "product-images: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images: admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- custom-requests --------------------------------------------------------------
create policy "custom-requests: anyone uploads into uploads/"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'custom-requests'
    and (storage.foldername(name))[1] = 'uploads'
  );

create policy "custom-requests: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'custom-requests' and (select public.is_admin()));

create policy "custom-requests: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'custom-requests' and (select public.is_admin()));
