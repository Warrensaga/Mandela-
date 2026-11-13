import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeliveryEstimate } from '../components/product/DeliveryEstimate';
import { Gallery } from '../components/product/Gallery';
import { OptionSelector } from '../components/product/OptionSelector';
import { ProductBadges } from '../components/product/ProductCard';
import { ProductGrid } from '../components/product/ProductGrid';
import { RecentlyViewed } from '../components/product/RecentlyViewed';
import { SaveButton } from '../components/product/SaveButton';
import { recordRecentlyViewed } from '../state/recentlyViewed';
import { Button, ButtonAnchor } from '../components/ui/Button';
import { Icon, WhatsAppIcon } from '../components/ui/Icon';
import { Price } from '../components/ui/Price';
import { QuantityInput } from '../components/ui/QuantityInput';
import { Seo } from '../components/ui/Seo';
import { GridSkeleton, Skeleton } from '../components/ui/Skeleton';
import { StockBadge } from '../components/ui/StockBadge';
import { useAsync } from '../hooks/useAsync';
import { ApiError, fetchCatalog, fetchProductBySlug, type ProductDetail } from '../lib/api';
import { similarProducts } from '../lib/catalog/similar';
import {
  findVariant,
  initialSelection,
  missingOptions,
  priceRange,
  stockState,
  totalStock,
  variantLabel,
  type Selection,
} from '../lib/catalog/variants';
import { formatKES } from '../lib/format';
import { productMessage, whatsappLink } from '../lib/whatsapp';
import { useCart } from '../state/cart';
import { absUrl, productLd } from '../lib/seo';
import { useSite } from '../state/site';
import { usePageWhatsAppMessage } from '../state/whatsapp';
import NotFoundPage from './NotFoundPage';

function ProductSkeleton() {
  return (
    <div><div className="container-page grid gap-10 py-10 lg:grid-cols-[1.15fr_1fr]">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div></div>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const product = useAsync(() => fetchProductBySlug(slug), [slug]);

  if (product.error instanceof ApiError && product.error.code === 'NOT_FOUND') return <NotFoundPage />;
  if (product.error) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-navy-800">{product.error.message}</p>
        <Button variant="outline" className="mt-4" onClick={product.reload}>
          Try again
        </Button>
      </div>
    );
  }
  if (!product.data || product.data.slug !== slug) return <ProductSkeleton />;
  return <ProductView key={product.data.id} product={product.data} />;
}

function ProductView({ product }: { product: ProductDetail }) {
  const { settings, categoryById, categories } = useSite();
  const cart = useCart();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<Selection>(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const category = categoryById(product.categoryId);

  const variant = product.hasVariants ? findVariant(product, selection) : undefined;
  const missing = product.hasVariants ? missingOptions(product, selection) : [];
  const complete = !product.hasVariants || Boolean(variant);
  const range = priceRange(product);

  const price = variant?.price ?? (product.hasVariants ? range.min : product.price);
  const compareAt = variant ? variant.compareAtPrice : product.hasVariants ? null : product.compareAtPrice;
  const stock = variant ? variant.stock : product.hasVariants ? totalStock(product) : product.stock;
  const threshold = variant?.lowStockThreshold ?? product.lowStockThreshold;
  const stockInfo = stockState(stock, threshold, product.madeToOrder, product.leadTimeDays);
  const canBuy = complete && (product.madeToOrder || stock > 0);
  const maxQty = product.madeToOrder ? 99 : Math.max(1, Math.min(stock, 99));
  const label = variant ? variantLabel(product, variant) : null;
  const sku = variant?.sku ?? product.sku;
  const pageUrl = absUrl(`/product/${product.slug}`);

  useEffect(() => recordRecentlyViewed(product.id), [product.id]);
  useEffect(() => setQuantity((q) => Math.min(q, maxQty)), [maxQty]);
  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 2500);
    return () => window.clearTimeout(t);
  }, [added]);

  const waMessage = useMemo(
    () => productMessage({ name: product.name, variantLabel: label, price: complete ? price : null, quantity, url: pageUrl }),
    [product.name, label, price, complete, quantity, pageUrl],
  );
  usePageWhatsAppMessage(waMessage);

  const addToCart = (openDrawer = true) => {
    if (!canBuy) return;
    const image = product.images.find((i) => i.id === variant?.imageId) ?? product.images[0];
    cart.add({
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      name: product.name,
      variantLabel: label,
      sku: sku ?? null,
      unitPrice: price,
      compareAtPrice: compareAt,
      imageUrl: image?.url ?? null,
      quantity,
      maxQuantity: maxQty,
      madeToOrder: product.madeToOrder,
      freeDelivery: product.freeDelivery,
      leadTimeDays: product.leadTimeDays,
    });
    setAdded(true);
    if (openDrawer) cart.openDrawer();
  };

  const related = useAsync(() => fetchCatalog(), []);
  const relatedProducts = useMemo(
    () => similarProducts({ id: product.id, categoryId: product.categoryId, room: product.room, price: product.price }, related.data ?? [], categories, 8),
    [product.id, product.categoryId, product.room, product.price, related.data, categories],
  );


  let buttonLabel = 'Add to cart';
  if (missing.length) {
    const names = missing.map((m) => m.toLowerCase());
    buttonLabel = `Choose ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}`;
  }
  else if (product.hasVariants && !variant) buttonLabel = 'Not available';
  else if (!canBuy) buttonLabel = 'Out of stock';

  const buyNow = () => {
    if (!canBuy) return;
    addToCart(false);
    navigate('/checkout');
  };

  return (
    <div>
      <div className="container-page py-8 sm:py-12">
        <Seo
          // Matches how Kenyans search: "<product> price in Kenya". Price first in the description.
          title={`${product.name} Price in Kenya`}
          description={`${product.name} price in Kenya: ${product.hasVariants && range.min !== range.max ? 'from ' : ''}${formatKES(range.min)}${
            category ? ` · ${category.name}` : ''
          }, delivered across Kenya. ${product.description ?? `Made in our Nairobi workshop by ${settings.storeName}.`}`}
          image={product.images[0]?.url}
          path={`/product/${product.slug}`}
          type="product"
          jsonLd={productLd(product, category, settings)}
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            ...(category ? [{ name: category.name, path: `/category/${category.slug}` }] : []),
            { name: product.name, path: `/product/${product.slug}` },
          ]}
        />
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="tap hover:text-brand-600">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/shop" className="tap hover:text-brand-600">Shop</Link></li>
            {category && (
              <>
                <li aria-hidden="true">/</li>
                <li><Link to={`/category/${category.slug}`} className="tap hover:text-brand-600">{category.name}</Link></li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-navy-800">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 [&>*]:min-w-0">
          <div className="lg:sticky lg:top-[calc(var(--header-offset,0px)+1.5rem)] lg:self-start lg:transition-[top] lg:duration-300">
            <Gallery images={product.images} productName={product.name} activeImageId={variant?.imageId} />
          </div>

          <div>
            {category && <p className="eyebrow">{category.name}</p>}
            <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Price amount={price} compareAt={compareAt} from={product.hasVariants && !variant && range.min !== range.max} size="lg" />
              {complete && <StockBadge state={stockInfo} />}
            </div>
            <div className="mt-3"><ProductBadges product={product} /></div>
            {product.description && <p className="mt-6 leading-relaxed text-ink/85">{product.description}</p>}
            {(product.dimensions || product.materials) && (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {[product.dimensions, product.materials].filter(Boolean).join(' · ')}
              </p>
            )}

            {product.hasVariants && product.options.length > 0 && (
              <div className="mt-8 border-t border-paper-200 pt-6">
                <OptionSelector
                  product={product}
                  selection={selection}
                  onSelect={(name, value) => setSelection((s) => ({ ...s, [name]: value }))}
                />
              </div>
            )}

            <Link
              to="/custom-request"
              className="group mt-8 flex items-center justify-between gap-4 border border-paper-200 bg-paper-100 p-4 transition-colors hover:border-brand-600"
            >
              <span>
                <span className="block text-sm font-medium text-navy-800">Customise this piece</span>
                <span className="block text-xs text-muted">Another size, colour or fabric? Tell us and we will send you a quote.</span>
              </span>
              <span className="text-xl text-gold-500 transition-transform group-hover:rotate-90" aria-hidden="true">+</span>
            </Link>

            <div className="mt-6 flex flex-wrap items-stretch gap-3">
              <QuantityInput value={quantity} onChange={setQuantity} max={maxQty} />
              <Button size="lg" className="min-w-[220px] flex-1" disabled={!canBuy} onClick={buyNow}>
                {canBuy ? <>Buy now · {formatKES(price * quantity)}</> : buttonLabel}
              </Button>
            </div>
            <div className="mt-3 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" disabled={!canBuy} onClick={() => addToCart(true)} aria-describedby="add-status">
                <Icon name="cart" className="h-4 w-4" /> {added ? 'Added to cart' : 'Add to cart'}
              </Button>
              <SaveButton productId={product.id} productName={product.name} variant="full" />
            </div>
            <p id="add-status" className="sr-only" aria-live="polite">
              {added ? `${product.name} added to cart` : ''}
            </p>
            {settings.whatsappNumber && (
              <ButtonAnchor
                variant="whatsapp"
                size="lg"
                className="mt-3 w-full"
                href={whatsappLink(settings.whatsappNumber, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Order via WhatsApp
              </ButtonAnchor>
            )}
            {complete && sku && <p className="label-mono mt-4 text-muted">SKU {sku}</p>}

            <div className="mt-8 divide-y divide-paper-200 border-y border-paper-200">
              <Accordion title="Delivery & orders" defaultOpen>
                <DeliveryEstimate leadTimeDays={product.leadTimeDays} madeToOrder={product.madeToOrder} freeDelivery={product.freeDelivery} />
              </Accordion>
              <Accordion title="Product details">
                <dl className="space-y-2 text-sm">
                  {product.dimensions && <div className="grid grid-cols-3 gap-4"><dt className="text-navy-800">Dimensions</dt><dd className="col-span-2 text-muted">{product.dimensions}</dd></div>}
                  {product.materials && <div className="grid grid-cols-3 gap-4"><dt className="text-navy-800">Materials</dt><dd className="col-span-2 text-muted">{product.materials}</dd></div>}
                  {product.room && <div className="grid grid-cols-3 gap-4"><dt className="text-navy-800">Room</dt><dd className="col-span-2 text-muted">{product.room}</dd></div>}
                  {product.colour && <div className="grid grid-cols-3 gap-4"><dt className="text-navy-800">Colour</dt><dd className="col-span-2 text-muted">{product.colour}</dd></div>}
                  {product.leadTimeDays > 0 && <div className="grid grid-cols-3 gap-4"><dt className="text-navy-800">Lead time</dt><dd className="col-span-2 text-muted">About {product.leadTimeDays} days</dd></div>}
                </dl>
              </Accordion>
              <Accordion title="Payment">
                <p className="text-sm text-muted">
                  Pay after we confirm your order on WhatsApp, by M-Pesa or bank transfer.{' '}
                  {product.madeToOrder && `A ${settings.depositPercent}% deposit starts production.`}
                </p>
              </Accordion>
            </div>
          </div>
        </div>

        <section aria-labelledby="related-heading" className="mt-20 border-t border-paper-200 pt-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="related-heading" className="text-3xl sm:text-4xl">More like this</h2>
            {category && (
              <Link to={`/category/${category.slug}`} className="tap text-sm font-semibold text-navy-800 underline decoration-paper-300 underline-offset-[6px] hover:text-brand-600 hover:decoration-brand-600">
                More in {category.name}
              </Link>
            )}
          </div>
          {related.loading && !related.data ? <GridSkeleton count={4} /> : <ProductGrid products={relatedProducts} />}
        </section>

        <RecentlyViewed excludeId={product.id} />
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="label-mono flex cursor-pointer list-none items-center justify-between py-4 text-navy-800 [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="chevronDown" className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}
