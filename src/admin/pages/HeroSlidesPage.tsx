import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { HeroSlideRow } from '../../lib/database.types';
import { ApiError, deleteHeroSlide, listHeroSlides, saveHeroSlide, setSortOrder } from '../../lib/api/admin';
import { formatLongDate } from '../../lib/format';
import { isSafeLink } from '../../lib/url';
import { ImageField } from '../components/ImageField';
import { SortableList } from '../components/SortableList';
import { Badge, Btn, Card, Empty, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

type Draft = Partial<HeroSlideRow>;

/** datetime-local value <-> ISO, in the browser's timezone (the owner is in Nairobi). */
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function liveState(s: HeroSlideRow): { text: string; tone: 'success' | 'neutral' | 'warning' } {
  const now = Date.now();
  if (!s.is_active) return { text: 'Inactive', tone: 'neutral' };
  if (s.starts_at && new Date(s.starts_at).getTime() > now) return { text: `Starts ${formatLongDate(s.starts_at)}`, tone: 'warning' };
  if (s.ends_at && new Date(s.ends_at).getTime() <= now) return { text: 'Ended', tone: 'neutral' };
  return { text: 'Live', tone: 'success' };
}

function Preview({ d }: { d: Draft }) {
  return (
    <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-navy-900 text-paper-50">
      {d.image_url && <img src={d.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/40 to-transparent" />
      <div className="absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-center p-5">
        <p className="font-serif text-2xl leading-tight font-semibold">{d.headline || 'Headline'}</p>
        {d.subtext && <p className="mt-1 text-xs text-paper-100/90">{d.subtext}</p>}
        {d.cta_label && <span className="mt-3 inline-block w-fit rounded-full bg-paper-50 px-3 py-1 text-xs text-navy-900">{d.cta_label}</span>}
      </div>
    </div>
  );
}

export default function HeroSlidesPage() {
  const slides = useAsync(listHeroSlides, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = slides.data ?? [];

  const save = async () => {
    if (!draft) return;
    const errors: string[] = [];
    if (!draft.headline?.trim()) errors.push('Headline is required.');
    if (!draft.image_url) errors.push('Upload a desktop image.');
    if (draft.cta_url?.trim() && !isSafeLink(draft.cta_url.trim())) errors.push('Button link must start with / (a shop page) or https://.');
    if (draft.cta_url && !draft.cta_label) errors.push('Add a button label for the link.');
    if (draft.starts_at && draft.ends_at && new Date(draft.ends_at) <= new Date(draft.starts_at)) errors.push('End must be after start.');
    if (errors.length) return setMsg({ kind: 'error', text: errors.join(' ') });
    setBusy(true);
    try {
      await saveHeroSlide({
        ...(draft.id ? { id: draft.id } : { sort_order: list.length + 1 }),
        headline: (draft.headline ?? '').trim(),
        subtext: draft.subtext?.trim() || null,
        cta_label: draft.cta_label?.trim() || null,
        cta_url: draft.cta_url?.trim() || null,
        image_url: draft.image_url as string,
        mobile_image_url: draft.mobile_image_url ?? null,
        is_active: draft.is_active ?? true,
        starts_at: draft.starts_at ?? null,
        ends_at: draft.ends_at ?? null,
      });
      setDraft(null);
      setMsg({ kind: 'success', text: 'Slide saved.' });
      slides.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Hero carousel"
        description="Home page slides (3 to 5 works best). Drag to reorder; schedule slides with start and end dates."
        actions={<Btn onClick={() => setDraft({ is_active: true })}>New slide</Btn>}
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {slides.loading && !slides.data ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty>No slides. The home page hides the carousel until you add one.</Empty>
      ) : (
        <Card>
          <SortableList
            items={list}
            getId={(s) => s.id}
            getLabel={(s) => s.headline}
            onReorder={(l) => void setSortOrder('hero_slides', l.map((s) => s.id)).then(slides.reload).catch(() => setMsg({ kind: 'error', text: 'Could not reorder.' }))}
            renderItem={(s) => {
              const st = liveState(s);
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <img src={s.image_url} alt="" className="h-12 w-24 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-800">{s.headline}</p>
                    <p className="truncate text-xs text-muted">{s.cta_label ? `${s.cta_label} → ${s.cta_url}` : 'No button'}</p>
                  </div>
                  <Badge tone={st.tone}>{st.text}</Badge>
                  <Btn variant="secondary" onClick={() => setDraft({ ...s })}>Edit</Btn>
                  <Btn variant="secondary" onClick={() => void saveHeroSlide({ id: s.id, headline: s.headline, image_url: s.image_url, is_active: !s.is_active }).then(slides.reload)}>
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (window.confirm('Delete this slide and its images?')) void deleteHeroSlide(s).then(slides.reload);
                    }}
                  >
                    Delete
                  </Btn>
                </div>
              );
            }}
          />
        </Card>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit slide' : 'New slide'}
        wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save slide'}</Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-navy-800">Live preview</p>
              <Preview d={draft} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Desktop image (wide, at least 1920px)" value={draft.image_url ?? null} folder="hero" onChange={(url) => setDraft({ ...draft, image_url: url ?? undefined })} />
              <ImageField label="Mobile image (portrait, optional)" value={draft.mobile_image_url ?? null} folder="hero" aspect="aspect-[4/5] max-w-40" onChange={(url) => setDraft({ ...draft, mobile_image_url: url })} />
              <LabeledField label="Headline" className="sm:col-span-2">
                {(fid) => <input id={fid} maxLength={120} className={inputCls} value={draft.headline ?? ''} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Subtext" className="sm:col-span-2">
                {(fid) => <textarea id={fid} rows={2} className={inputCls} value={draft.subtext ?? ''} onChange={(e) => setDraft({ ...draft, subtext: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Button label">
                {(fid) => <input id={fid} className={inputCls} value={draft.cta_label ?? ''} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Button link" hint="e.g. /category/dining, /product/amani-sofa, /custom-request">
                {(fid) => <input id={fid} className={inputCls} value={draft.cta_url ?? ''} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Show from (optional)">
                {(fid) => <input id={fid} type="datetime-local" className={inputCls} value={toLocal(draft.starts_at)} onChange={(e) => setDraft({ ...draft, starts_at: fromLocal(e.target.value) })} />}
              </LabeledField>
              <LabeledField label="Show until (optional)">
                {(fid) => <input id={fid} type="datetime-local" className={inputCls} value={toLocal(draft.ends_at)} onChange={(e) => setDraft({ ...draft, ends_at: fromLocal(e.target.value) })} />}
              </LabeledField>
              <Toggle label="Active" checked={draft.is_active ?? true} onChange={(v) => setDraft({ ...draft, is_active: v })} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
