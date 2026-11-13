import { useAsync } from '../../hooks/useAsync';
import { fetchReviews, type Review } from '../../lib/api';
import { parseISODate } from '../../lib/format';
import { useSite } from '../../state/site';
import { ButtonAnchor } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { DeliveryAndPayment } from './HomeSections';

function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`inline-flex gap-0.5 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 ${i <= full ? 'fill-gold-500' : 'fill-paper-300'}`}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

const monthYear = (iso: string) => parseISODate(iso).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

function ReviewCard({ review, url, delay }: { review: Review; url: string; delay: number }) {
  return (
    <Reveal as="li" delay={delay} className="flex flex-col border border-paper-200 bg-white p-6 sm:p-8">
      <Stars rating={review.rating} />
      <blockquote className="mt-4 flex-1">
        <p className="line-clamp-[8] font-serif text-lg leading-relaxed text-ink">{review.body}</p>
      </blockquote>
      <footer className="mt-6 flex items-end justify-between gap-3 border-t border-paper-200 pt-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-navy-800">{review.authorName}</p>
          {review.date && <p className="text-xs text-muted">{monthYear(review.date)}</p>}
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="tap shrink-0 font-label text-[10px] font-semibold tracking-[0.12em] text-muted uppercase hover:text-brand-600">
            Google review
          </a>
        ) : (
          <span className="shrink-0 font-label text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Google review</span>
        )}
      </footer>
    </Reveal>
  );
}

/**
 * Real customer reviews from Google, entered by the owner in Admin → Reviews.
 * Nothing is invented: until the first review is published, the delivery and
 * payment summary is shown in this spot instead.
 */
export function GoogleReviews() {
  const { settings } = useSite();
  const reviews = useAsync(() => fetchReviews(6), []);
  const g = settings.googleReviews;

  if (reviews.loading && !reviews.data) return null;
  if (!reviews.data?.length) return <DeliveryAndPayment />;

  return (
    <section aria-labelledby="reviews-heading" className="section-y bg-paper-100">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="reviews-heading" className="text-3xl sm:text-4xl">Reviews from Google</h2>
            {g.rating !== null && (
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-navy-800">
                <span className="font-serif text-3xl">{g.rating.toFixed(1)}</span>
                <Stars rating={g.rating} />
                <span className="text-sm text-muted">
                  {g.count !== null ? `${g.count} review${g.count === 1 ? '' : 's'} on Google` : 'on Google'}
                </span>
              </p>
            )}
          </div>
          {g.url && (
            <ButtonAnchor href={g.url} target="_blank" rel="noopener noreferrer" variant="outline" size="md">
              Read all reviews on Google
            </ButtonAnchor>
          )}
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.data.map((r, i) => (
            <ReviewCard key={r.id} review={r} url={g.url} delay={(i % 3) * 0.06} />
          ))}
        </ul>
      </div>
    </section>
  );
}
