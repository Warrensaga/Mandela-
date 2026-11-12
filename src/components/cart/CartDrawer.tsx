import { formatKES } from '../../lib/format';
import { useCart } from '../../state/cart';
import { ButtonLink } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { CartLines } from './CartLines';

export function CartDrawer() {
  const cart = useCart();
  const empty = cart.lines.length === 0;
  return (
    <Drawer
      open={cart.drawerOpen}
      onClose={cart.closeDrawer}
      title={empty ? 'Your cart' : `Your cart (${cart.count})`}
      footer={
        !empty && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-base">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold text-navy-800">{formatKES(cart.subtotal)}</span>
            </div>
            <p className="text-xs text-muted">Delivery is calculated at checkout from your area.</p>
            <ButtonLink to="/checkout" onClick={cart.closeDrawer} size="lg" className="w-full">
              Checkout
            </ButtonLink>
            <ButtonLink to="/cart" onClick={cart.closeDrawer} variant="outline" className="w-full">
              View cart
            </ButtonLink>
          </div>
        )
      }
    >
      {empty ? (
        <div className="py-12 text-center">
          <p className="font-serif text-2xl text-navy-800">Your cart is empty</p>
          <p className="mt-2 text-sm text-muted">Find something you will love for years.</p>
          <ButtonLink to="/shop" onClick={cart.closeDrawer} className="mt-6">
            Browse the shop
          </ButtonLink>
        </div>
      ) : (
        <CartLines compact onNavigate={cart.closeDrawer} />
      )}
    </Drawer>
  );
}
