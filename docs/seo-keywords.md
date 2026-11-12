# SEO keyword plan

How the site targets searches, and what to do when adding real products and content.

## Where the keywords come from

Google search suggestions for Kenya (13 Nov 2026), i.e. what people in Kenya actually type. They show
**what is searched**, not exact monthly volumes. (Semrush volume data could not be pulled: the account
needs more API units.) Competitor page titles (MoKo, Victoria Homestore, Fairdeal) were checked for the
patterns they target.

**How Kenyans search for furniture**

| Pattern | Real examples from Google suggestions |
|---|---|
| Product + **price(s) in Kenya** | sofa sets in kenya and their prices · bed prices in kenya 5 by 6 · dining table set price in kenya · wardrobe prices in kenya · tv stand kenya price |
| Product + **Nairobi** | beds in nairobi · office chairs nairobi · rugs nairobi · wardrobes nairobi · sofa nairobi |
| **Shop / showroom** in a place | furniture shops in nairobi · furniture shops in nairobi with prices · furniture showrooms nairobi · furniture mombasa · office furniture nairobi |
| **Size** words | 6 by 6 bed · 5 by 6 mattress · 3.5 by 6 · l shaped sofa |
| **Style / type** words | l shaped sofa designs in kenya · living room sets · tv unit · tv console · vanity table · recliner sofa · sofa bed · mahogany beds |
| **Custom** | custom made furniture nairobi · handmade furniture nairobi · customised furniture nairobi |
| **Designs / ideas** | sofa sets designs in kenya · dining set designs in kenya · tv stand designs kenya |

## What is now on the site

- **Home**: "Furniture Shop in Nairobi, Kenya" title, description with "prices online", and an
  "A furniture shop in Nairobi, with prices online" section linking to every category.
- **Category pages**: a keyword title per category (e.g. *Sofa Sets in Kenya & Prices: L-Shaped Sofas*,
  *Beds in Kenya & Bed Prices in Nairobi*, *TV Stands & TV Units in Kenya: Prices*), a description with
  the live "from KES" price, and a short intro under the products (live count, lowest price, delivery
  areas, custom-made link, related categories). All in `src/lib/seoKeywords.ts`.
- **Product pages**: "*<product>* Price in Kenya" titles; the description starts with the live price.
- **Shop, Offers, Custom orders, Contact, Delivery, Payment**: titles built on "furniture online in
  Kenya with prices", "custom made furniture in Nairobi", "furniture showroom in Nairobi", "furniture
  delivery in Nairobi & across Kenya".
- **Link previews** (WhatsApp, Facebook) use the same titles.
- Copy stays factual: no "best" or "cheapest" claims, prices are always live.
- A `<meta name="keywords">` tag is **not** used: Google ignores it.

## Do this when adding real products (biggest impact)

1. **Put the type and size in the product name.** Searches use them.
   *Amani 3-Seater Sofa*, *Kifalme 6x6 Mahogany Bed*, *Jamii 6-Seater Dining Set*, rather than just
   *Amani* or *Kifalme*. The name becomes the page title: "Amani 3-Seater Sofa Price in Kenya".
2. **Use Kenyan size names in variations**: *4 by 6*, *5 by 6*, *6 by 6* for beds and mattresses;
   *3-seater*, *5-seater*, *L-shaped* for sofas.
3. **Name the wood or material** in the Materials field and description: mahogany, mvule, oak, velvet,
   chenille, leather. These are searched.
4. **Write a real description** (2 to 4 sentences): what it is, size, material, who it suits.
5. **Describe each photo** (the photo description field): "Grey velvet 3-seater sofa, front view".
6. **Category descriptions** (Admin → Categories) show under the page heading; one sentence using the
   category's keywords helps.

## Guides to write next (Phase 4)

Question searches each guide can answer, with links to the matching category:

| Guide | Searches it answers |
|---|---|
| Bed and mattress sizes in Kenya (4x6, 5x6, 6x6 in cm) | 6 by 6 bed size in cm · 6 by 6 bed in metres · kenya mattress sizes |
| L-shaped sofa buying guide | l shaped sofa designs in kenya · l shaped sofa price in kenya |
| Choosing a dining set for your space | dining set designs in kenya · small dining set kenya |
| TV stand and TV unit ideas | tv stand designs kenya · floating tv stand kenya |
| Caring for mahogany and hardwood furniture | mahogany furniture · mvule wood furniture |
| Setting up a home office in Kenya | office furniture nairobi · home office desk kenya |

## Off-site (needed to rank in Nairobi)

- **Google Business Profile** for the showroom, category "Furniture store", same name, phone and address
  as the site. This drives "furniture shops in Nairobi" map results.
- Add the site link to your **Instagram and TikTok** bios (both are in suggestions: "furniture nairobi
  instagram").
- Submit the sitemap in Google Search Console after deploying, then check *Performance → Queries* after
  a few weeks to see which searches you appear for, and adjust titles in `src/lib/seoKeywords.ts`.
