import { Link, useParams } from 'react-router';
import { PaymentInstructions } from '../components/order/PaymentInstructions';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { Icon, WhatsAppIcon } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { recallPlacedOrder } from '../lib/api';
import { formatDay, formatDayRange, formatKES } from '../lib/format';
import { formatKePhone } from '../lib/phone';
import { orderMessage, whatsappLink } from '../lib/whatsapp';
import { useSite } from '../state/site';
import { usePageWhatsAppMessage } from '../state/whatsapp';

export default function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams();
  const { settings } = useSite();
  const order = recallPlacedOrder(orderNumber);
  const message = order ? orderMessage(order) : null;
  usePageWhatsAppMessage(message);

  if (!order || !message) {
    // Opened in a new tab or after the session ended: the order is safe, show tracking.
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <Seo title="Order placed" noindex />
        <h1 className="text-4xl">Order {orderNumber}</h1>
        <p className="mt-3 text-muted">Your order is saved. Track its status any time with your order number and phone.</p>
        <ButtonLink to={`/track-order?order=${encodeURIComponent(orderNumber)}`} className="mt-6">
          Track this order
        </ButtonLink>
      </div>
    );
  }

  const isDeposit = order.depositAmount > 0;
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Seo title={`Order ${order.orderNumber} received`} noindex />
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <p className="eyebrow mt-5">Order received</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Thank you, {order.customer.fullName.split(' ')[0]}</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted">
          Your order number is <strong className="text-navy-800">{order.orderNumber}</strong>. Send it to us on WhatsApp and we will
          confirm availability, delivery and payment.
        </p>
        {settings.whatsappNumber && (
          <ButtonAnchor
            variant="whatsapp"
            size="lg"
            className="mt-6"
            href={whatsappLink(settings.whatsappNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            Continue on WhatsApp
          </ButtonAnchor>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section aria-labelledby="summary-heading" className="card p-5 sm:p-6">
          <h2 id="summary-heading" className="text-2xl">Order summary</h2>
          <ul className="mt-4 divide-y divide-paper-200 text-sm">
            {order.items.map((i) => (
              <li key={`${i.productId}:${i.variantId ?? ''}`} className="flex justify-between gap-4 py-3">
                <span>
                  <span className="font-medium text-navy-800">
                    {i.quantity} × {i.name}
                  </span>
                  {i.variantLabel && <span className="block text-muted">{i.variantLabel}</span>}
                  {i.madeToOrder && <span className="block text-xs text-navy-600">Made to order</span>}
                </span>
                <span className="shrink-0 font-medium text-navy-800">{formatKES(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-paper-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatKES(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery ({order.deliveryZone})</dt>
              <dd>{order.deliveryFee === 0 ? 'Free' : formatKES(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-paper-200 pt-3 text-base font-semibold text-navy-800">
              <dt>Total</dt>
              <dd>{formatKES(order.total)}</dd>
            </div>
            {isDeposit && (
              <>
                <div className="flex justify-between text-navy-800">
                  <dt>Deposit to start</dt>
                  <dd className="font-semibold">{formatKES(order.depositAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Balance before delivery</dt>
                  <dd>{formatKES(order.balanceDue)}</dd>
                </div>
              </>
            )}
          </dl>
          <dl className="mt-6 space-y-3 border-t border-paper-200 pt-4 text-sm">
            <div>
              <dt className="font-medium text-navy-800">Expected delivery</dt>
              <dd className="text-muted">{formatDayRange(order.estimatedDeliveryFrom, order.estimatedDeliveryTo)}</dd>
            </div>
            {order.preferredDeliveryDate && (
              <div>
                <dt className="font-medium text-navy-800">Your preferred date</dt>
                <dd className="text-muted">{formatDay(order.preferredDeliveryDate)}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-navy-800">Deliver to</dt>
              <dd className="text-muted">
                {order.deliveryAddress}, {order.deliveryCity}
                <br />
                {formatKePhone(order.customer.phone)}
              </dd>
            </div>
            {order.notes && (
              <div>
                <dt className="font-medium text-navy-800">Your notes</dt>
                <dd className="whitespace-pre-line text-muted">{order.notes}</dd>
              </div>
            )}
            {order.deliveryZoneNotes && <p className="text-xs text-muted">{order.deliveryZoneNotes}</p>}
          </dl>
        </section>

        <div className="space-y-6">
          <PaymentInstructions
            payment={settings.payment}
            orderNumber={order.orderNumber}
            amountDue={isDeposit ? order.depositAmount : order.total}
            isDeposit={isDeposit}
          />
          <p className="text-center text-sm text-muted">
            Check progress any time on{' '}
            <Link to={`/track-order?order=${encodeURIComponent(order.orderNumber)}`} className="text-navy-800 underline underline-offset-4">
              Track your order
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
