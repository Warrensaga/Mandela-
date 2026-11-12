-- =============================================================================
-- Mandela Heritage Furniture: seed data
--
-- PLACEHOLDER CONTENT. Every product, price, fee, image and contact detail here
-- is original placeholder data for development. Replace it from the admin
-- before launch. Images use placehold.co until the owner uploads real photos.
--
-- The category tree is a best guess (see CLAUDE.md). Confirm it before launch;
-- categories are fully editable in the admin afterwards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings (all public: the storefront needs them)
-- -----------------------------------------------------------------------------
insert into public.settings (key, value, is_public) values
  ('store_name',      '"Mandela Heritage Furniture"', true),
  ('whatsapp_number', '"254701333358"', true),
  ('deposit_percent', '50', true),
  ('contact', '{
      "phone": "+254 701 333 358",
      "email": "",
      "address": "Showroom address to be confirmed, Nairobi",
      "map_url": null
    }', true),
  ('opening_hours', '[
      {"days": "Monday to Friday", "hours": "8:00am to 6:00pm"},
      {"days": "Saturday", "hours": "9:00am to 5:00pm"},
      {"days": "Sunday and public holidays", "hours": "Closed"}
    ]', true),
  ('payment_instructions', '{
      "mpesa_paybill": {"business_number": "", "account_number": "Your order number"},
      "mpesa_till": "",
      "bank": {"bank_name": "", "account_name": "", "account_number": "", "branch": ""},
      "notes": "Pay only after we confirm your order on WhatsApp. Use your order number as the reference."
    }', true),
  ('announcement_bar', '{
      "enabled": true,
      "text": "Free delivery within Nairobi on orders over KES 100,000",
      "link": "/delivery"
    }', true),
  ('social', '{
      "tiktok": "https://www.tiktok.com/@mandela_h_furnitures",
      "instagram": "https://www.instagram.com/mandela_heritagefurniture/"
    }', true);

-- -----------------------------------------------------------------------------
-- Categories (two levels)
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, description, sort_order, image_url) values
  ('Living Room',            'living-room',            'Sofas, armchairs, tables and storage for the heart of the home.', 1, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Living+Room'),
  ('Dining',                 'dining',                 'Dining sets, tables, chairs and sideboards.',                     2, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Dining'),
  ('Bedroom',                'bedroom',                'Beds, wardrobes and bedroom storage.',                            3, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Bedroom'),
  ('Mattresses and Bedding', 'mattresses-and-bedding', 'Mattresses, pillows and bedding.',                                4, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Mattresses'),
  ('Office',                 'office',                 'Desks, chairs and storage for home and business offices.',       5, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Office'),
  ('Outdoor and Garden',     'outdoor-and-garden',     'Patio sets, garden chairs and loungers.',                         6, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Outdoor'),
  ('Home Decor',             'home-decor',             'Rugs, mirrors, lighting and wall art.',                           7, 'https://placehold.co/800x800/5c3d2e/f5efe6?text=Home+Decor');

insert into public.categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.sort_order
from (values
  ('living-room', 'Sofas',                       'sofas',                       1),
  ('living-room', 'Armchairs',                   'armchairs',                   2),
  ('living-room', 'Coffee Tables',               'coffee-tables',               3),
  ('living-room', 'TV Stands',                   'tv-stands',                   4),
  ('living-room', 'Console and Side Tables',     'console-and-side-tables',     5),
  ('living-room', 'Cabinets and Shelving',       'cabinets-and-shelving',       6),
  ('dining',      'Dining Sets',                 'dining-sets',                 1),
  ('dining',      'Dining Tables',               'dining-tables',               2),
  ('dining',      'Dining Chairs',               'dining-chairs',               3),
  ('dining',      'Bar Stools',                  'bar-stools',                  4),
  ('dining',      'Sideboards',                  'sideboards',                  5),
  ('bedroom',     'Beds and Bed Frames',         'beds-and-bed-frames',         1),
  ('bedroom',     'Wardrobes',                   'wardrobes',                   2),
  ('bedroom',     'Dressing Tables',             'dressing-tables',             3),
  ('bedroom',     'Bedside Tables',              'bedside-tables',              4),
  ('bedroom',     'Chests of Drawers',           'chests-of-drawers',           5),
  ('office',      'Office Desks',                'office-desks',                1),
  ('office',      'Office Chairs',               'office-chairs',               2),
  ('office',      'Reception Furniture',         'reception-furniture',         3),
  ('office',      'Filing and Storage',          'filing-and-storage',          4),
  ('outdoor-and-garden', 'Patio Sets',           'patio-sets',                  1),
  ('outdoor-and-garden', 'Garden Chairs',        'garden-chairs',               2),
  ('outdoor-and-garden', 'Loungers',             'loungers',                    3),
  ('home-decor',  'Rugs',                        'rugs',                        1),
  ('home-decor',  'Mirrors',                     'mirrors',                     2),
  ('home-decor',  'Lighting',                    'lighting',                    3),
  ('home-decor',  'Wall Art',                    'wall-art',                    4)
) as v(parent_slug, name, slug, sort_order)
join public.categories p on p.slug = v.parent_slug;

-- -----------------------------------------------------------------------------
-- Delivery zones (PLACEHOLDER fees: confirm with the owner)
-- -----------------------------------------------------------------------------
insert into public.delivery_zones
  (name, fee, estimated_days_min, estimated_days_max, free_delivery_threshold, sort_order, notes)
values
  ('Nairobi Core', 1000, 1, 1, 100000, 1,
   'CBD, Westlands, Kilimani, Kileleshwa, Lavington, Parklands, South B and C, Lang''ata, Karen. Next-day delivery for in-stock items.'),
  ('Nairobi Environs', 2500, 1, 3, null, 2,
   'Ruiru, Juja, Kiambu, Syokimau, Athi River, Kitengela, Rongai, Ngong. Delivery in 1 to 3 days.'),
  ('Mombasa, Kisumu and Nakuru', 6500, 3, 5, null, 3,
   'Courier delivery to your door, or collect from the courier branch in town.'),
  ('Rest of Kenya', 9000, 3, 7, null, 4,
   'Courier delivery or branch pick-up in your nearest town. Delivery in 3 to 7 days.');

-- -----------------------------------------------------------------------------
-- Hero slides
-- -----------------------------------------------------------------------------
insert into public.hero_slides
  (image_url, mobile_image_url, headline, subtext, cta_label, cta_url, sort_order)
values
  ('https://placehold.co/1920x900/5c3d2e/f5efe6?text=Hero+1',
   'https://placehold.co/800x1000/5c3d2e/f5efe6?text=Hero+1',
   'Crafted to be handed down',
   'Hardwood furniture made for Kenyan homes and built to last for generations.',
   'Shop living room', '/category/living-room', 1),
  ('https://placehold.co/1920x900/2f4a3a/f5efe6?text=Hero+2',
   'https://placehold.co/800x1000/2f4a3a/f5efe6?text=Hero+2',
   'Gather around the table',
   'Dining sets for four to eight, in oak, walnut and ebony finishes.',
   'Shop dining', '/category/dining', 2),
  ('https://placehold.co/1920x900/a0522d/f5efe6?text=Hero+3',
   'https://placehold.co/800x1000/a0522d/f5efe6?text=Hero+3',
   'Made to your measure',
   'Tell us what you need and our workshop will quote and build it for you.',
   'Request a custom piece', '/custom-request', 3),
  ('https://placehold.co/1920x900/3b2a20/f5efe6?text=Hero+4',
   'https://placehold.co/800x1000/3b2a20/f5efe6?text=Hero+4',
   'Rest well',
   'Beds and orthopaedic mattresses in every size.',
   'Shop bedroom', '/category/bedroom', 4);

-- -----------------------------------------------------------------------------
-- Products (original placeholder names and copy)
-- -----------------------------------------------------------------------------
insert into public.products (
  name, slug, description, category_id, price, compare_at_price, sku, has_variants,
  stock_quantity, is_active, is_featured, dimensions, materials, room, colour,
  lead_time_days, is_made_to_order, free_delivery, badge
)
select
  v.name, v.slug, v.description, c.id, v.price, v.compare_at_price, v.sku, v.has_variants,
  v.stock_quantity, v.is_active, v.is_featured, v.dimensions, v.materials, v.room, v.colour,
  v.lead_time_days, v.is_made_to_order, v.free_delivery, v.badge
from (values
  -- Living Room
  ('Amani Sofa', 'amani-sofa', 'sofas',
   'A deep-seated sofa on a kiln-dried hardwood frame, available as a 2-seater, 3-seater or 5-seater L-shape in three fabrics and three colours.',
   65000::numeric, null::numeric, 'MH-AMANI', true, 0, true, true,
   '2-seater W170cm, 3-seater W210cm, 5-seater L-shape 280 x 200cm. D90cm, H85cm',
   'Kiln-dried hardwood frame, high-density foam', 'Living Room', null::text, 2, false, false, 'New'),
  ('Pwani Armchair', 'pwani-armchair', 'armchairs',
   'A compact accent armchair with turned mahogany legs and a woven cover.',
   24500, 28000, 'MH-PWANI', true, 0, true, false,
   'W80 x D82 x H90cm', 'Mahogany legs, woven fabric', 'Living Room', null, 2, false, false, 'Sale'),
  ('Kito Coffee Table', 'kito-coffee-table', 'coffee-tables',
   'A low coffee table in solid mahogany with a lower shelf for books and baskets.',
   18500, null, 'MH-KITO', false, 12, true, true,
   'W110 x D60 x H45cm', 'Solid mahogany', 'Living Room', 'Mahogany', 1, false, false, null),

  -- Dining
  ('Savanna Dining Set', 'savanna-dining-set', 'dining-sets',
   'A solid oak table with upholstered chairs, for four, six or eight, in three finishes.',
   85000, null, 'MH-SAVANNA', true, 0, true, true,
   '4-seater table 140 x 85cm, 6-seater 180 x 90cm, 8-seater 220 x 100cm. H76cm',
   'Solid oak, upholstered seats', 'Dining', null, 3, false, true, null),
  ('Jamii Dining Chair', 'jamii-dining-chair', 'dining-chairs',
   'A sturdy slatted dining chair in mvule hardwood. Sold individually.',
   7500, null, 'MH-JAMII', false, 40, true, false,
   'W45 x D50 x H92cm', 'Mvule hardwood', 'Dining', 'Walnut', 1, false, false, null),
  ('Mvule Sideboard', 'mvule-sideboard', 'sideboards',
   'A four-door sideboard built to order in solid mvule. Allow three weeks for the workshop.',
   54000, null, 'MH-MVULE', false, 0, true, false,
   'W180 x D45 x H80cm', 'Solid mvule', 'Dining', 'Natural', 21, true, false, 'Made to order'),

  -- Bedroom
  ('Kifalme Bed', 'kifalme-bed', 'beds-and-bed-frames',
   'A panelled bed frame with a tall headboard, in three sizes and three finishes.',
   48000, null, 'MH-KIFALME', true, 0, true, true,
   '4x6 / 5x6 / 6x6 ft. Headboard H130cm', 'Solid mahogany', 'Bedroom', null, 3, false, false, null),
  ('Nyota Bedside Table', 'nyota-bedside-table', 'bedside-tables',
   'A two-drawer bedside table with brass handles.',
   9500, 11000, 'MH-NYOTA', false, 3, true, false,
   'W45 x D40 x H55cm', 'Mahogany veneer, brass', 'Bedroom', 'Walnut', 1, false, false, 'Sale'),
  ('Imara Wardrobe', 'imara-wardrobe', 'wardrobes',
   'A three-door wardrobe with hanging space, shelves and two drawers.',
   62000, null, 'MH-IMARA', false, 0, true, false,
   'W150 x D60 x H210cm', 'Engineered wood, hardwood trim', 'Bedroom', 'White', 5, false, false, null),

  -- Mattresses and Bedding
  ('Pumziko Orthopaedic Mattress', 'pumziko-orthopaedic-mattress', 'mattresses-and-bedding',
   'A firm orthopaedic foam mattress in four sizes and two thicknesses.',
   22000, null, 'MH-PUMZIKO', true, 0, true, true,
   '3x6 / 4x6 / 5x6 / 6x6 ft. 8 or 10 inch', 'High-density orthopaedic foam, quilted cover', 'Bedroom', null, 1, false, true, null),
  ('Tulivu Pillow Pair', 'tulivu-pillow-pair', 'mattresses-and-bedding',
   'Two medium-support fibre pillows with cotton covers.',
   3500, null, 'MH-TULIVU', false, 60, true, false,
   '48 x 74cm each', 'Hollow fibre, cotton cover', 'Bedroom', 'White', 1, false, false, null),

  -- Office
  ('Kazi Executive Desk', 'kazi-executive-desk', 'office-desks',
   'A wide executive desk with a three-drawer pedestal and cable cut-outs.',
   42000, null, 'MH-KAZI', false, 6, true, false,
   'W160 x D75 x H76cm', 'Walnut veneer, hardwood frame', 'Office', 'Walnut', 2, false, false, null),
  ('Tegemeo Ergonomic Chair', 'tegemeo-ergonomic-chair', 'office-chairs',
   'A mesh-back office chair with lumbar support and adjustable arms.',
   19500, null, 'MH-TEGEMEO', true, 0, true, false,
   'W64 x D60 x H110 to 120cm', 'Mesh, nylon base', 'Office', null, 1, false, false, 'New'),

  -- Outdoor and Garden
  ('Bustani Patio Set', 'bustani-patio-set', 'patio-sets',
   'A four-seat patio set with a slatted table, for verandas and gardens.',
   68000, 75000, 'MH-BUSTANI', false, 4, true, true,
   'Table 120 x 70cm, four chairs', 'Treated hardwood', 'Outdoor', 'Natural', 3, false, true, 'Sale'),
  ('Jua Sun Lounger', 'jua-sun-lounger', 'loungers',
   'A reclining sun lounger with an adjustable backrest.',
   16500, null, 'MH-JUA', false, 8, true, false,
   'L195 x W65cm', 'Treated hardwood', 'Outdoor', 'Natural', 2, false, false, null),

  -- Home Decor
  ('Kanga Woven Rug', 'kanga-woven-rug', 'rugs',
   'A flat-woven rug with a geometric pattern, in three sizes.',
   9500, null, 'MH-KANGA', true, 0, true, false,
   '120x170 / 160x230 / 200x290cm', 'Cotton blend', 'Living Room', null, 1, false, false, null),
  ('Ziwa Round Mirror', 'ziwa-round-mirror', 'mirrors',
   'A round wall mirror with a slim brass-finish frame.',
   8500, null, 'MH-ZIWA', false, 15, true, false,
   '80cm diameter', 'Glass, metal frame', 'Living Room', 'Brass', 1, false, false, null),

  -- Inactive (draft) product: must NOT be visible to anonymous visitors
  ('Draft Bar Stool', 'draft-bar-stool', 'bar-stools',
   'Inactive draft product used to check that hidden products stay hidden.',
   6000, null, 'MH-DRAFT', false, 10, false, false,
   null, null, 'Dining', null, 1, false, false, null)
) as v(name, slug, cat, description, price, compare_at_price, sku, has_variants,
       stock_quantity, is_active, is_featured, dimensions, materials, room, colour,
       lead_time_days, is_made_to_order, free_delivery, badge)
join public.categories c on c.slug = v.cat;

-- One placeholder image per product
insert into public.product_images (product_id, url, alt_text, sort_order)
select p.id,
       'https://placehold.co/1200x900/5c3d2e/f5efe6?text=' || replace(p.name, ' ', '+'),
       p.name || ' (placeholder image)',
       0
from public.products p;

-- Extra colour images for the Amani Sofa (linked to variants below)
insert into public.product_images (product_id, url, alt_text, sort_order)
select p.id, v.url, v.alt, v.sort_order
from public.products p
cross join (values
  ('https://placehold.co/1200x900/8a8a8a/ffffff?text=Amani+Sofa+Grey',  'Amani Sofa in Grey (placeholder image)',  1),
  ('https://placehold.co/1200x900/1f2a44/ffffff?text=Amani+Sofa+Navy',  'Amani Sofa in Navy (placeholder image)',  2),
  ('https://placehold.co/1200x900/d8c3a5/3b2a20?text=Amani+Sofa+Beige', 'Amani Sofa in Beige (placeholder image)', 3)
) as v(url, alt, sort_order)
where p.slug = 'amani-sofa';

-- -----------------------------------------------------------------------------
-- Options
-- -----------------------------------------------------------------------------
insert into public.product_options (product_id, name, "values", sort_order)
select p.id, v.name, v.vals, v.sort_order
from (values
  ('amani-sofa',                   'Size',      array['2-Seater', '3-Seater', '5-Seater L-Shape'], 1),
  ('amani-sofa',                   'Fabric',    array['Chenille', 'Velvet', 'Leather'],            2),
  ('amani-sofa',                   'Colour',    array['Grey', 'Navy', 'Beige'],                    3),
  ('pwani-armchair',               'Colour',    array['Terracotta', 'Olive', 'Cream'],             1),
  ('savanna-dining-set',           'Size',      array['4-Seater', '6-Seater', '8-Seater'],         1),
  ('savanna-dining-set',           'Finish',    array['Natural Oak', 'Walnut', 'Ebony'],           2),
  ('kifalme-bed',                  'Size',      array['4x6', '5x6', '6x6'],                        1),
  ('kifalme-bed',                  'Finish',    array['Mahogany', 'Walnut', 'White'],              2),
  ('pumziko-orthopaedic-mattress', 'Size',      array['3x6', '4x6', '5x6', '6x6'],                 1),
  ('pumziko-orthopaedic-mattress', 'Thickness', array['8 inch', '10 inch'],                        2),
  ('tegemeo-ergonomic-chair',      'Colour',    array['Black', 'Grey'],                            1),
  ('kanga-woven-rug',              'Size',      array['120x170cm', '160x230cm', '200x290cm'],      1)
) as v(slug, name, vals, sort_order)
join public.products p on p.slug = v.slug;

-- -----------------------------------------------------------------------------
-- Variant generator (session-only helper): builds every combination of a
-- product's options. Price = base + per-value adjustments (null when no
-- adjustment, so it falls back to the product price). Stock is a fixed
-- pseudo-random 0 to 8 so some combinations are out of stock or low.
-- -----------------------------------------------------------------------------
create function pg_temp.seed_variants(
  p_slug           text,
  p_adjust         jsonb   default '{}'::jsonb,
  p_compare_markup numeric default null
)
returns void
language plpgsql
as $$
declare
  v_pid    uuid;
  v_base   numeric;
  v_prefix text;
begin
  select id, price, sku into v_pid, v_base, v_prefix from public.products where slug = p_slug;

  insert into public.product_variants
    (product_id, sku, option_values, price, compare_at_price, stock_quantity, sort_order)
  with recursive opts as (
    select o.name, o."values", row_number() over (order by o.sort_order, o.name) as rn
    from public.product_options o
    where o.product_id = v_pid
  ),
  combos as (
    select 0::bigint as rn, '{}'::jsonb as ov, 0::numeric as adj, ''::text as code, ''::text as ord
    union all
    select o.rn,
           c.ov || jsonb_build_object(o.name, val.v),
           c.adj + coalesce((p_adjust -> o.name ->> val.v)::numeric, 0),
           c.code || '-' || upper(left(regexp_replace(val.v, '[^A-Za-z0-9]', '', 'g'), 3)),
           c.ord || lpad(val.i::text, 3, '0')
    from combos c
    join opts o on o.rn = c.rn + 1
    cross join lateral unnest(o."values") with ordinality as val(v, i)
  )
  select v_pid,
         v_prefix || code,
         ov,
         case when adj = 0 then null else v_base + adj end,
         case when p_compare_markup is null then null
              else round((v_base + adj) * p_compare_markup, -2) end,
         abs(hashtext(v_prefix || code)) % 9,
         row_number() over (order by ord)
  from combos
  where rn = (select count(*) from opts);
end;
$$;

select pg_temp.seed_variants('amani-sofa',
  '{"Size": {"2-Seater": -15000, "5-Seater L-Shape": 45000},
    "Fabric": {"Velvet": 8000, "Leather": 30000}}');
select pg_temp.seed_variants('pwani-armchair', '{}', 1.143);
select pg_temp.seed_variants('savanna-dining-set',
  '{"Size": {"6-Seater": 30000, "8-Seater": 65000},
    "Finish": {"Walnut": 7000, "Ebony": 10000}}');
select pg_temp.seed_variants('kifalme-bed',
  '{"Size": {"5x6": 8000, "6x6": 16000}, "Finish": {"Walnut": 4000}}');
select pg_temp.seed_variants('pumziko-orthopaedic-mattress',
  '{"Size": {"4x6": 5000, "5x6": 9000, "6x6": 14000}, "Thickness": {"10 inch": 6000}}');
select pg_temp.seed_variants('tegemeo-ergonomic-chair');
select pg_temp.seed_variants('kanga-woven-rug',
  '{"Size": {"160x230cm": 6500, "200x290cm": 14500}}');

-- Make sure the demo always has at least one in-stock variant per product
update public.product_variants pv
   set stock_quantity = 6
 where pv.sort_order = 1;

-- Link Amani Sofa variants to their colour image
update public.product_variants pv
   set image_id = i.id
  from public.products p, public.product_images i
 where p.slug = 'amani-sofa'
   and pv.product_id = p.id
   and i.product_id = p.id
   and i.alt_text = 'Amani Sofa in ' || (pv.option_values ->> 'Colour') || ' (placeholder image)';

-- Opening stock as ledger entries, so movement history starts from a known point
insert into public.inventory_movements (product_id, variant_id, change_quantity, reason, note)
select pv.product_id, pv.id, pv.stock_quantity, 'restock', 'Opening stock (seed)'
from public.product_variants pv
where pv.stock_quantity > 0;

insert into public.inventory_movements (product_id, change_quantity, reason, note)
select p.id, p.stock_quantity, 'restock', 'Opening stock (seed)'
from public.products p
where not p.has_variants and p.stock_quantity > 0;
