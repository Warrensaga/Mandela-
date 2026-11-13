import { CartLines, cartHasProblems } from '../components/cart/CartLines';
import { ButtonLink } from '../components/ui/Button';
import { Seo } from '../components/ui/Seo';
import { formatKES } from '../lib/format';
import { useCart } from '../state/cart';

export default function CartPage() {
  const cart = useCart();
  const empty = cart.lines.length === 0;
  const blocked = cartHasProblems(cart.lines);

  return (
    <div className="container-page py-10 sm:py-14">
      <Seo title="Your cart" noindex />
      <h1 className="text-4xl sm:text-5xl">Your cart</h1>
      {empty ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-navy-800">Your cart is empty</p>
          <ButtonLink to="/shop" className="mt-6">
            Browse the shop
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
          <CartLines />
          <aside className="card h-fit p-6 lg:sticky lg:top-[calc(var(--header-offset,0px)+1.5rem)] lg:transition-[top] lg:duration-300">
            <h2 className="text-2xl">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-navy-800">{formatKES(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-muted">{cart.allFreeDelivery ? 'Free' : 'Chosen at checkout'}</dd>
              </div>
            </dl>
            {cart.hasMadeToOrder && (
              <p className="mt-4 bg-paper-100 p-3 text-xs text-navy-800">
                Your cart has made-to-order pieces. We will ask for a deposit to start production.
              </p>
            )}
            <ButtonLink
              to="/checkout"
              size="lg"
              className={`mt-6 w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`}
              aria-disabled={blocked}
            >
              Continue to checkout
            </ButtonLink>
            {blocked && <p className="mt-2 text-xs text-terracotta-600">Please fix the items marked above first.</p>}
            <p className="mt-4 text-center text-xs text-muted">No payment is taken online.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
