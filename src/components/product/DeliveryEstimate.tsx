import { deliveryWindow } from '../../lib/checkout';
import { formatDayRange, formatKES } from '../../lib/format';
import { useSite } from '../../state/site';
import { Icon } from '../ui/Icon';

interface DeliveryEstimateProps {
  leadTimeDays: number;
  madeToOrder: boolean;
  freeDelivery: boolean;
}

/** Expected delivery dates per zone for this product. */
export function DeliveryEstimate({ leadTimeDays, madeToOrder, freeDelivery }: DeliveryEstimateProps) {
  const { zones } = useSite();
  if (!zones.length) return null;
  return (
    <section aria-labelledby="delivery-estimate" className="rounded-2xl bg-paper-100 p-4 sm:p-5">
      <h2 id="delivery-estimate" className="flex items-center gap-2 font-sans text-sm font-semibold text-navy-800">
        <Icon name="truck" className="h-5 w-5 text-brand-600" />
        Delivery estimate
      </h2>
      {madeToOrder && (
        <p className="mt-2 text-sm text-muted">
          Built for you in our workshop: allow about {leadTimeDays} days before delivery.
        </p>
      )}
      <ul className="mt-3 space-y-2 text-sm">
        {zones.map((z) => {
          const w = deliveryWindow(z, leadTimeDays);
          return (
            <li key={z.id} className="flex flex-wrap justify-between gap-x-4">
              <span className="text-navy-800">{z.name}</span>
              <span className="text-muted">
                {formatDayRange(w.from, w.to)}
                {' · '}
                {freeDelivery ? <span className="font-medium text-brand-600">Free</span> : formatKES(z.fee)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
