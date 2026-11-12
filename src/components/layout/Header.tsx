import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useHeaderScroll } from '../../hooks/useHeaderScroll';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { useCart } from '../../state/cart';
import { useSaved } from '../../state/saved';
import { useSite } from '../../state/site';
import { Icon, WhatsAppIcon } from '../ui/Icon';
import { AnnouncementBar } from './AnnouncementBar';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { SearchSuggestionList, useSearchSuggestions } from './SearchSuggestions';

const navItem =
  'relative inline-flex h-12 items-center px-3.5 font-label text-[11px] font-bold tracking-[0.16em] whitespace-nowrap text-navy-800 uppercase transition-colors hover:text-brand-600 xl:px-4';
const activeMark = 'text-brand-600 after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5 after:bg-gold-500 xl:after:inset-x-4';

/**
 * Always-visible product search. On desktop it carries a category picker, so a
 * search can be limited to one collection.
 */
function SearchBar({ id, withCategories = false }: { id: string; withCategories?: boolean }) {
  const navigate = useNavigate();
  const { categories } = useSite();
  const { pathname, search } = useLocation();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [used, setUsed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const listId = `${id}-suggestions`;
  const { items } = useSearchSuggestions(q, cat, used);
  const showList = open && q.trim().length >= 2 && items.length > 0;

  // Keep the box in step with the URL (e.g. after browser back), and close the list on navigation.
  useEffect(() => {
    setQ(pathname === '/shop' || pathname.startsWith('/category/') ? (new URLSearchParams(search).get('q') ?? '') : '');
    setOpen(false);
  }, [pathname, search]);

  useEffect(() => setActive(-1), [q, cat]);

  // Close when clicking or tapping outside the search box.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => !formRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    const picked = showList && active >= 0 ? items[active] : undefined;
    if (picked) return navigate(picked.to);
    const term = q.trim();
    const base = cat ? `/category/${cat}` : '/shop';
    navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showList) return setOpen(true);
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // Cycle through the suggestions; -1 means "nothing highlighted" (Enter searches the typed text).
      setActive((i) => {
        const next = i + step;
        if (next < -1) return items.length - 1;
        return next >= items.length ? -1 : next;
      });
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <form ref={formRef} role="search" onSubmit={submit} className="relative flex h-12 w-full border-2 border-navy-800 bg-paper-50 focus-within:border-brand-600">
      <label htmlFor={id} className="sr-only">Search furniture</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setUsed(true);
          setOpen(true);
        }}
        onFocus={() => {
          setUsed(true);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search sofas, beds, dining tables…"
        className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-ink placeholder:text-muted/80 focus:outline-none"
      />
      {showList && <SearchSuggestionList id={listId} items={items} activeIndex={active} onPick={() => setOpen(false)} />}
      {withCategories && (
        <>
          <label htmlFor={`${id}-cat`} className="sr-only">Search in</label>
          <select
            id={`${id}-cat`}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="w-44 shrink-0 cursor-pointer border-l border-paper-300 bg-transparent px-3 font-label text-[10px] font-bold tracking-[0.14em] text-navy-800 uppercase focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className="grid w-12 shrink-0 place-items-center bg-navy-800 text-white transition-colors hover:bg-brand-600 sm:w-14" aria-label="Search">
        <Icon name="search" className="h-5 w-5" />
      </button>
    </form>
  );
}

/**
 * Two-row header. Row 1: logo, a wide search bar and WhatsApp/cart. Row 2:
 * "Browse categories" (mega menu) and the main links. Phones get the logo,
 * cart and menu, with the search bar on its own row underneath.
 */
export function Header() {
  const { settings } = useSite();
  const cart = useCart();
  const saved = useSaved();
  const { compact, hidden } = useHeaderScroll();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, search } = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const [focusInside, setFocusInside] = useState(false);

  const isHidden = hidden && !focusInside;
  const onOffers = pathname === '/shop' && new URLSearchParams(search).get('offers') === '1';
  const phone = settings.contact.phone || (settings.whatsappNumber ? `+${settings.whatsappNumber}` : '');

  // Publish the visible header height as --header-offset (0 while hidden), so
  // sticky bars and side panels sit just below it.
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--header-offset', `${isHidden ? 0 : height}px`);
  }, [height, isHidden]);
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--header-offset');
    },
    [],
  );

  return (
    <>
      <AnnouncementBar />
      <header
        ref={headerRef}
        onFocus={() => setFocusInside(true)}
        onBlur={(e) => !headerRef.current?.contains(e.relatedTarget as Node) && setFocusInside(false)}
        className={`sticky top-0 z-40 border-b border-paper-200 bg-paper-50/95 backdrop-blur-md transition-transform duration-300 ease-out ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-paper-50 focus:px-3 focus:py-2">
          Skip to content
        </a>

        {/* Row 1 */}
        <div className={`container-page flex items-center gap-4 transition-[height] duration-300 lg:gap-8 ${compact ? 'h-16' : 'h-[72px] lg:h-[88px]'}`}>
          <Link to="/" className="shrink-0" aria-label={`${settings.storeName}, home`}>
            <img
              src="/logo.png"
              alt={settings.storeName}
              width={149}
              height={93}
              className={`w-auto transition-[height] duration-300 ${compact ? 'h-10' : 'h-12 lg:h-14'}`}
            />
          </Link>

          <div className="hidden flex-1 lg:block">
            <SearchBar id="site-search" withCategories />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-5">
            {settings.whatsappNumber && (
              <a
                href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}, I would like some help choosing furniture.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-3 text-navy-800 hover:text-brand-600 xl:flex"
              >
                <span className="grid h-11 w-11 place-items-center border border-paper-300">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <span className="leading-tight">
                  <span className="block font-label text-[9px] font-bold tracking-[0.18em] text-muted uppercase">Chat with us</span>
                  <span className="block text-sm font-semibold">{phone ? formatKePhone(phone) : 'WhatsApp'}</span>
                </span>
              </a>
            )}
            <Link
              to="/saved"
              className="relative flex items-center gap-3 p-2.5 text-navy-800 hover:text-brand-600 lg:p-0"
              aria-label={`Saved items, ${saved.count} ${saved.count === 1 ? 'item' : 'items'}`}
            >
              <span className="relative grid place-items-center lg:h-11 lg:w-11 lg:border lg:border-paper-300">
                <Icon name="heart" className="h-5 w-5" />
                {saved.count > 0 && (
                  <span className="absolute -top-2 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-terracotta-600 px-1 font-label text-[10px] font-bold text-white lg:-top-1.5 lg:-right-1.5">
                    {saved.count}
                  </span>
                )}
              </span>
              <span className="hidden font-label text-[11px] font-bold tracking-[0.16em] uppercase xl:inline">Saved</span>
            </Link>
            <button
              type="button"
              className="relative flex items-center gap-3 p-2.5 text-navy-800 hover:text-brand-600 lg:p-0"
              onClick={cart.openDrawer}
              aria-label={`Cart, ${cart.count} ${cart.count === 1 ? 'item' : 'items'}`}
            >
              <span className="relative grid place-items-center lg:h-11 lg:w-11 lg:border lg:border-paper-300">
                <Icon name="cart" className="h-5 w-5" />
                {cart.count > 0 && (
                  <span className="absolute -top-2 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 font-label text-[10px] font-bold text-navy-900 lg:-top-1.5 lg:-right-1.5">
                    {cart.count}
                  </span>
                )}
              </span>
              <span className="hidden font-label text-[11px] font-bold tracking-[0.16em] uppercase lg:inline">Cart</span>
            </button>
            <button
              type="button"
              className="-mr-2 p-2.5 text-navy-800 hover:text-brand-600 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Phones and tablets: search on its own row */}
        <div className={`container-page pb-3 lg:hidden ${compact ? 'hidden' : ''}`}>
          <SearchBar id="site-search-mobile" />
        </div>

        {/* Row 2 (desktop) */}
        <div className="hidden border-t border-paper-200 lg:block">
          <div className="container-page flex items-center gap-6">
            <MegaMenu />
            <nav aria-label="Main" className="flex items-center">
              <NavLink to="/" end className={({ isActive }) => `${navItem} ${isActive ? activeMark : ''}`}>
                Home
              </NavLink>
              <NavLink to="/shop" className={({ isActive }) => `${navItem} ${isActive && !onOffers ? activeMark : ''}`}>
                Shop
              </NavLink>
              <Link to="/shop?offers=1" className={`${navItem} !text-terracotta-600 hover:!text-terracotta-500 ${onOffers ? activeMark : ''}`}>
                Offers
              </Link>
              <NavLink to="/custom-request" className={({ isActive }) => `${navItem} ${isActive ? activeMark : ''}`}>
                Custom orders
              </NavLink>
              <NavLink to="/track-order" className={({ isActive }) => `${navItem} ${isActive ? activeMark : ''}`}>
                Track order
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => `${navItem} ${isActive ? activeMark : ''}`}>
                Contact
              </NavLink>
            </nav>
            <Link to="/delivery" className="ml-auto hidden items-center gap-2 font-label text-[10px] font-bold tracking-[0.16em] text-muted uppercase hover:text-brand-600 xl:flex">
              <Icon name="truck" className="h-4 w-4 text-gold-ink" /> Delivery across Kenya
            </Link>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
