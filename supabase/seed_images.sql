-- =============================================================================
-- Stand-in product, category and hero photos (run after seed.sql).
--
-- Free-licence photos from Unsplash (https://unsplash.com/license): free for
-- commercial use, no attribution required. They are NOT photos of the actual
-- Mandela Heritage pieces. Replace them with the owner's own photos from the
-- admin (Products → Photos, Categories, Hero carousel) before launch.
--
-- Image URLs use Unsplash's image server: auto=format serves WebP/AVIF, and the
-- storefront swaps the w= parameter to build a responsive srcset.
-- =============================================================================

create function pg_temp.unsplash(p_id text, p_w integer, p_ar text)
returns text language sql immutable as $$
  select 'https://images.unsplash.com/' || p_id || '?auto=format&fit=crop&q=80&w=' || p_w || '&ar=' || p_ar;
$$;

-- -----------------------------------------------------------------------------
-- Product photos. sort_order 0 replaces the main placeholder in place (variant
-- photo links stay intact); higher sort orders are updated or added.
-- -----------------------------------------------------------------------------
create temp table photo_plan (slug text, sort_order integer, photo text, alt text);

insert into photo_plan values
  ('amani-sofa',                   0, 'photo-1634497885778-152eb6fd543d', 'Amani Sofa, a deep-seated sofa on a wooden base'),
  ('amani-sofa',                   1, 'photo-1698936061086-2bf99c7b9fc5', 'Amani Sofa in Grey'),
  ('amani-sofa',                   2, 'photo-1642400491663-0c13037fc7f7', 'Amani Sofa in Navy'),
  ('amani-sofa',                   3, 'photo-1512212621149-107ffe572d2f', 'Amani Sofa in Beige'),
  ('pwani-armchair',               0, 'photo-1586023492125-27b2c045efd7', 'Pwani Armchair with a wooden frame and padded seat'),
  ('pwani-armchair',               1, 'photo-1506332088442-9e0024864f5d', 'Pwani Armchair in a neutral fabric'),
  ('kito-coffee-table',            0, 'photo-1777513538143-8525eb3943f6', 'Kito Coffee Table in solid wood'),
  ('savanna-dining-set',           0, 'photo-1581970696275-253e75ecf269', 'Savanna Dining Set, wooden table with chairs'),
  ('savanna-dining-set',           1, 'photo-1605885795793-097ffaee6b7c', 'Savanna Dining Set in a dining room'),
  ('jamii-dining-chair',           0, 'photo-1748975026839-e68da17878b3', 'Jamii Dining Chair in hardwood'),
  ('mvule-sideboard',              0, 'photo-1788506663473-394c2bec66a8', 'Mvule Sideboard with drawers and recessed handles'),
  ('mvule-sideboard',              1, 'photo-1762280237740-5a9292e527ab', 'Mvule Sideboard styled with a lamp and plant'),
  ('kifalme-bed',                  0, 'photo-1517912158475-fb0ab8c8eed1', 'Kifalme Bed, a wooden bed frame with white bedding'),
  ('kifalme-bed',                  1, 'photo-1631048499455-4f9e26f23b9f', 'Kifalme Bed in a bedroom'),
  ('nyota-bedside-table',          0, 'photo-1522771739844-6a9f6d5f14af', 'Nyota Bedside Table with a table lamp'),
  ('imara-wardrobe',               0, 'photo-1722349674028-a148f4364e43', 'Imara Wardrobe in a bedroom'),
  ('pumziko-orthopaedic-mattress', 0, 'photo-1647376036543-f9f543601a1d', 'Pumziko Orthopaedic Mattress'),
  ('pumziko-orthopaedic-mattress', 1, 'photo-1505693416388-ac5ce068fe85', 'Pumziko Mattress on a bed with a tufted headboard'),
  ('tulivu-pillow-pair',           0, 'photo-1600414428640-f78a67c2aa3b', 'Tulivu Pillow Pair on a bed'),
  ('kazi-executive-desk',          0, 'photo-1784012980517-005c26585344', 'Kazi Executive Desk in wood'),
  ('kazi-executive-desk',          1, 'photo-1519219788971-8d9797e0928e', 'Kazi Executive Desk with a desk lamp'),
  ('tegemeo-ergonomic-chair',      0, 'photo-1688578735352-9a6f2ac3b70a', 'Tegemeo Ergonomic Chair'),
  ('tegemeo-ergonomic-chair',      1, 'photo-1688578735427-994ecdea3ea4', 'Tegemeo Ergonomic Chair at a desk'),
  ('bustani-patio-set',            0, 'photo-1602860739945-9a61573cd62d', 'Bustani Patio Set, wooden table and chairs'),
  ('bustani-patio-set',            1, 'photo-1623625434531-d130448273c1', 'Bustani Patio Set on a veranda'),
  ('jua-sun-lounger',              0, 'photo-1627401974460-b8dc7eb3aba4', 'Jua Sun Lounger in wood'),
  ('kanga-woven-rug',              0, 'photo-1564444247765-a377a8bfd0b8', 'Kanga Woven Rug'),
  ('ziwa-round-mirror',            0, 'photo-1592078528550-ba08b97ead10', 'Ziwa Round Mirror');

-- Update photos that already exist at that position.
update public.product_images i
   set url = pg_temp.unsplash(pp.photo, 1200, '4:3'),
       alt_text = pp.alt
  from photo_plan pp
  join public.products p on p.slug = pp.slug
 where i.product_id = p.id and i.sort_order = pp.sort_order;

-- Add photos for positions that do not exist yet.
insert into public.product_images (product_id, url, alt_text, sort_order)
select p.id, pg_temp.unsplash(pp.photo, 1200, '4:3'), pp.alt, pp.sort_order
from photo_plan pp
join public.products p on p.slug = pp.slug
where not exists (select 1 from public.product_images i where i.product_id = p.id and i.sort_order = pp.sort_order);

-- -----------------------------------------------------------------------------
-- Category photos (top level)
-- -----------------------------------------------------------------------------
update public.categories c
   set image_url = pg_temp.unsplash(v.photo, 800, '1:1')
  from (values
    ('living-room',            'photo-1631679706909-1844bbd07221'),
    ('dining',                 'photo-1617806118233-18e1de247200'),
    ('bedroom',                'photo-1566665797739-1674de7a421a'),
    ('mattresses-and-bedding', 'photo-1595526114035-0d45ed16cfbf'),
    ('office',                 'photo-1571624436279-b272aff752b5'),
    ('outdoor-and-garden',     'photo-1623625434531-d130448273c1'),
    ('home-decor',             'photo-1617228206053-477863025d9c')
  ) as v(slug, photo)
 where c.slug = v.slug;

-- -----------------------------------------------------------------------------
-- Hero slides (matched by headline): wide desktop crop + portrait mobile crop
-- -----------------------------------------------------------------------------
update public.hero_slides h
   set image_url        = pg_temp.unsplash(v.photo, 1920, '16:9'),
       mobile_image_url = pg_temp.unsplash(v.photo, 800, '4:5')
  from (values
    ('Crafted to be handed down', 'photo-1618221195710-dd6b41faaea6'),
    ('Gather around the table',   'photo-1505409628601-edc9af17fda6'),
    ('Made to your measure',      'photo-1631396326838-de37e5f8bcbc'),
    ('Rest well',                 'photo-1616486029423-aaa4789e8c9a')
  ) as v(headline, photo)
 where h.headline = v.headline;
