import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { DeliveryZoneRow } from '../../lib/database.types';
import { ApiError, deleteZone, listZones, saveZone, setSortOrder } from '../../lib/api/admin';
import { formatKES } from '../../lib/format';
import { SortableList } from '../components/SortableList';
import { Badge, Btn, Card, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

type Draft = { id?: string; name: string; fee: string; min: string; max: string; threshold: string; notes: string; is_active: boolean };

const toDraft = (z?: DeliveryZoneRow): Draft => ({
  id: z?.id,
  name: z?.name ?? '',
  fee: z ? String(z.fee) : '',
  min: z ? String(z.estimated_days_min) : '1',
  max: z ? String(z.estimated_days_max) : '3',
  threshold: z?.free_delivery_threshold ? String(z.free_delivery_threshold) : '',
  notes: z?.notes ?? '',
  is_active: z?.is_active ?? true,
});

export default function DeliveryZonesPage() {
  const zones = useAsync(listZones, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const save = async () => {
    if (!draft) return;
    const fee = Number(draft.fee);
    const min = Number(draft.min);
    const max = Number(draft.max);
    if (!draft.name.trim() || !(fee >= 0) || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
      return setMsg({ kind: 'error', text: 'Enter a name, a fee of 0 or more, and whole-number days where max ≥ min.' });
    }
    if (draft.threshold && !(Number(draft.threshold) > 0)) return setMsg({ kind: 'error', text: 'Free-delivery threshold must be above 0, or blank.' });
    try {
      await saveZone({
        ...(draft.id ? { id: draft.id } : { sort_order: (zones.data?.length ?? 0) + 1 }),
        name: draft.name.trim(),
        fee,
        estimated_days_min: min,
        estimated_days_max: max,
        free_delivery_threshold: draft.threshold ? Number(draft.threshold) : null,
        notes: draft.notes.trim() || null,
        is_active: draft.is_active,
      });
      setDraft(null);
      setMsg({ kind: 'success', text: 'Zone saved.' });
      zones.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    }
  };

  const remove = async (z: DeliveryZoneRow) => {
    if (!window.confirm(`Delete "${z.name}"?`)) return;
    try {
      await deleteZone(z.id);
      zones.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError && e.code === 'IN_USE' ? 'Orders use this zone, so it cannot be deleted. Deactivate it instead.' : 'Could not delete.' });
    }
  };

  return (
    <>
      <PageHeader title="Delivery zones" description="Customers pick one at checkout; its fee is added to the order." actions={<Btn onClick={() => setDraft(toDraft())}>New zone</Btn>} />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {zones.loading && !zones.data ? (
        <Loading />
      ) : (
        <Card>
          <SortableList
            items={zones.data ?? []}
            getId={(z) => z.id}
            getLabel={(z) => z.name}
            onReorder={(l) => void setSortOrder('delivery_zones', l.map((z) => z.id)).then(zones.reload)}
            renderItem={(z) => (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-800">{z.name}</p>
                  <p className="text-xs text-muted">
                    {formatKES(z.fee)} · {z.estimated_days_min}–{z.estimated_days_max} days
                    {z.free_delivery_threshold ? ` · free over ${formatKES(z.free_delivery_threshold)}` : ''}
                  </p>
                </div>
                {!z.is_active && <Badge>Inactive</Badge>}
                <Btn variant="secondary" onClick={() => setDraft(toDraft(z))}>Edit</Btn>
                <Btn variant="danger" onClick={() => void remove(z)}>Delete</Btn>
              </div>
            )}
          />
        </Card>
      )}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit zone' : 'New zone'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn onClick={() => void save()}>Save</Btn>
          </>
        }
      >
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledField label="Name" className="sm:col-span-2">{(fid) => <input id={fid} className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}</LabeledField>
            <LabeledField label="Fee (KES)">{(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />}</LabeledField>
            <LabeledField label="Free over (KES, optional)">{(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: e.target.value })} />}</LabeledField>
            <LabeledField label="Days (min)">{(fid) => <input id={fid} inputMode="numeric" className={inputCls} value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />}</LabeledField>
            <LabeledField label="Days (max)">{(fid) => <input id={fid} inputMode="numeric" className={inputCls} value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} />}</LabeledField>
            <LabeledField label="Notes shown to customers" className="sm:col-span-2" hint="Areas covered, courier or branch pick-up details.">
              {(fid) => <textarea id={fid} rows={3} className={inputCls} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />}
            </LabeledField>
            <Toggle label="Active" checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
          </div>
        )}
      </Modal>
    </>
  );
}
