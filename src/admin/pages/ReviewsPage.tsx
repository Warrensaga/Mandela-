import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { ReviewRow } from '../../lib/database.types';
import { ApiError, deleteReview, listAllReviews, listSettings, saveReview, saveSettings, setSortOrder } from '../../lib/api/admin';
import { formatLongDate } from '../../lib/format';
import { isHttpsUrl } from '../../lib/url';
import { useAdmin } from '../auth';
import { SortableList } from '../components/SortableList';
import { Badge, Btn, Card, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

type Draft = { id?: string; author_name: string; rating: string; body: string; review_date: string; is_published: boolean };

const toDraft = (r?: ReviewRow): Draft => ({
  id: r?.id,
  author_name: r?.author_name ?? '',
  rating: String(r?.rating ?? 5),
  body: r?.body ?? '',
  review_date: r?.review_date ?? '',
  is_published: r?.is_published ?? true,
});

/** Google link, overall rating and count, as shown on the business's Google profile (owner only). */
function GoogleLinkCard() {
  const settings = useAsync(listSettings, []);
  const [form, setForm] = useState({ url: '', rating: '', count: '' });
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const v = settings.data?.find((s) => s.key === 'google_reviews')?.value as { url?: string; rating?: number | null; count?: number | null } | undefined;
    if (v) setForm({ url: v.url ?? '', rating: v.rating ? String(v.rating) : '', count: v.count ? String(v.count) : '' });
  }, [settings.data]);

  const save = async () => {
    const url = form.url.trim();
    const rating = form.rating.trim() ? Number(form.rating) : null;
    const count = form.count.trim() ? Number(form.count) : null;
    const errors: string[] = [];
    if (url && !isHttpsUrl(url)) errors.push('The Google link must start with https://.');
    if (rating !== null && !(rating >= 1 && rating <= 5)) errors.push('Rating must be between 1 and 5, e.g. 4.8.');
    if (count !== null && !(Number.isInteger(count) && count > 0)) errors.push('Number of reviews must be a whole number.');
    if (errors.length) return setMsg({ kind: 'error', text: errors.join(' ') });
    try {
      await saveSettings({ google_reviews: { url, rating, count } });
      setMsg({ kind: 'success', text: 'Saved. It shows on the home page above the reviews.' });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    }
  };

  return (
    <Card title="Your Google reviews page">
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <LabeledField label="Link to your Google reviews" hint="On Google Maps, open your business → Reviews → Share, and paste the link.">
          {(fid) => <input id={fid} className={inputCls} placeholder="https://maps.app.goo.gl/…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />}
        </LabeledField>
        <LabeledField label="Overall rating (optional)" hint="Exactly as Google shows it, e.g. 4.8.">
          {(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />}
        </LabeledField>
        <LabeledField label="Number of reviews (optional)" hint="As shown on Google.">
          {(fid) => <input id={fid} inputMode="numeric" className={inputCls} value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />}
        </LabeledField>
      </div>
      <div className="mt-3">
        <Btn onClick={() => void save()}>Save</Btn>
      </div>
    </Card>
  );
}

export default function ReviewsPage() {
  const { isOwner } = useAdmin();
  const reviews = useAsync(listAllReviews, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const save = async () => {
    if (!draft) return;
    const rating = Number(draft.rating);
    const errors: string[] = [];
    if (!draft.author_name.trim()) errors.push('Enter the reviewer’s name as shown on Google.');
    if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) errors.push('Choose 1 to 5 stars.');
    if (!draft.body.trim()) errors.push('Paste the review text.');
    if (draft.body.trim().length > 1500) errors.push('Review text is limited to 1,500 characters.');
    if (draft.author_name.trim().length > 80) errors.push('Name is limited to 80 characters.');
    if (errors.length) return setMsg({ kind: 'error', text: errors.join(' ') });
    try {
      await saveReview({
        ...(draft.id ? { id: draft.id } : { sort_order: (reviews.data?.length ?? 0) + 1 }),
        author_name: draft.author_name.trim(),
        rating,
        body: draft.body.trim(),
        review_date: draft.review_date || null,
        is_published: draft.is_published,
      });
      setDraft(null);
      setMsg({ kind: 'success', text: 'Review saved.' });
      reviews.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    }
  };

  const remove = async (r: ReviewRow) => {
    if (!window.confirm(`Delete the review by ${r.author_name}? This cannot be undone. To hide it instead, untick "Show on the website".`)) return;
    try {
      await deleteReview(r.id);
      reviews.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not delete.' });
    }
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Copy your best real reviews from Google, exactly as written. They replace the delivery and payment block on the home page (up to 6 shown, in this order). Never write or edit reviews yourself."
        actions={<Btn onClick={() => setDraft(toDraft())}>Add review</Btn>}
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {isOwner && (
        <div className="mb-6">
          <GoogleLinkCard />
        </div>
      )}
      {reviews.loading && !reviews.data ? (
        <Loading />
      ) : (reviews.data ?? []).length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No reviews yet. Until you add one, the home page shows the delivery and payment summary in this spot.</p>
        </Card>
      ) : (
        <Card>
          <SortableList
            items={reviews.data ?? []}
            getId={(r) => r.id}
            getLabel={(r) => r.author_name}
            onReorder={(l) => void setSortOrder('reviews', l.map((r) => r.id)).then(reviews.reload)}
            renderItem={(r) => (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-800">
                    {r.author_name} <span className="text-gold-ink" aria-label={`${r.rating} stars`}>{'★'.repeat(r.rating)}</span>
                  </p>
                  <p className="line-clamp-2 text-xs text-muted">
                    {r.review_date ? `${formatLongDate(r.review_date)} · ` : ''}
                    {r.body}
                  </p>
                </div>
                {!r.is_published && <Badge>Hidden</Badge>}
                <Btn variant="secondary" onClick={() => setDraft(toDraft(r))}>Edit</Btn>
                <Btn variant="danger" onClick={() => void remove(r)}>Delete</Btn>
              </div>
            )}
          />
        </Card>
      )}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit review' : 'Add a Google review'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn onClick={() => void save()}>Save</Btn>
          </>
        }
      >
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledField label="Reviewer name (as on Google)" className="sm:col-span-2">
              {(fid) => <input id={fid} maxLength={80} className={inputCls} value={draft.author_name} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} />}
            </LabeledField>
            <LabeledField label="Stars">
              {(fid) => (
                <select id={fid} className={inputCls} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{`${n} star${n === 1 ? '' : 's'}`}</option>
                  ))}
                </select>
              )}
            </LabeledField>
            <LabeledField label="Date of the review (optional)">
              {(fid) => <input id={fid} type="date" className={inputCls} value={draft.review_date} onChange={(e) => setDraft({ ...draft, review_date: e.target.value })} />}
            </LabeledField>
            <LabeledField label="Review text (copy it exactly)" className="sm:col-span-2" hint={`${draft.body.trim().length} / 1,500 characters`}>
              {(fid) => <textarea id={fid} rows={6} maxLength={1500} className={inputCls} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />}
            </LabeledField>
            <Toggle label="Show on the website" checked={draft.is_published} onChange={(v) => setDraft({ ...draft, is_published: v })} />
          </div>
        )}
      </Modal>
    </>
  );
}
