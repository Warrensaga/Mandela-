import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { CategoryRow } from '../../lib/database.types';
import { ApiError, countProductsByCategory, deleteCategory, listAllCategories, saveCategory, setSortOrder } from '../../lib/api/admin';
import { slugify } from '../../lib/admin/labels';
import { ImageField } from '../components/ImageField';
import { SortableList } from '../components/SortableList';
import { Badge, Btn, Card, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

type Draft = Partial<CategoryRow> & { name: string; slug: string };

export default function CategoriesPage() {
  const cats = useAsync(listAllCategories, []);
  const counts = useAsync(countProductsByCategory, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const all = cats.data ?? [];
  const parents = all.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => all.filter((c) => c.parent_id === id);

  const reorder = async (list: CategoryRow[]) => {
    try {
      await setSortOrder('categories', list.map((c) => c.id));
      cats.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not reorder.' });
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) {
      setMsg({ kind: 'error', text: 'Enter a name and a valid slug (lowercase letters, numbers, dashes).' });
      return;
    }
    setBusy(true);
    try {
      const { id, name, slug, parent_id, description, image_url, is_active, sort_order } = draft;
      await saveCategory({
        ...(id ? { id } : { sort_order: sort_order ?? (parent_id ? childrenOf(parent_id).length : parents.length) + 1 }),
        name: name.trim(),
        slug,
        parent_id: parent_id ?? null,
        description: description?.trim() || null,
        image_url: image_url ?? null,
        is_active: is_active ?? true,
      });
      setDraft(null);
      setMsg({ kind: 'success', text: 'Category saved.' });
      cats.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CategoryRow) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory(c.id);
      setMsg({ kind: 'success', text: 'Category deleted.' });
      cats.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not delete.' });
    }
  };

  const row = (c: CategoryRow) => {
    const n = counts.data?.get(c.id) ?? 0;
    const kids = childrenOf(c.id).length;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-navy-800">{c.name}</span>
        <span className="text-xs text-muted">/{c.slug}</span>
        {!c.is_active && <Badge>Inactive</Badge>}
        <Badge tone="info">{n} product{n === 1 ? '' : 's'}</Badge>
        <div className="ml-auto flex gap-1">
          {!c.parent_id && <Btn variant="ghost" onClick={() => setDraft({ name: '', slug: '', parent_id: c.id, is_active: true })}>+ Sub-category</Btn>}
          <Btn variant="secondary" onClick={() => setDraft({ ...c })}>Edit</Btn>
          <Btn
            variant="secondary"
            onClick={() => void saveCategory({ id: c.id, name: c.name, slug: c.slug, is_active: !c.is_active }).then(cats.reload)}
          >
            {c.is_active ? 'Deactivate' : 'Activate'}
          </Btn>
          <Btn variant="danger" disabled={n > 0 || kids > 0} title={n > 0 || kids > 0 ? 'Has products or sub-categories: deactivate instead' : undefined} onClick={() => void remove(c)}>
            Delete
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Two levels: category and sub-category. Drag (or use the arrows) to reorder. Categories with products can only be deactivated."
        actions={<Btn onClick={() => setDraft({ name: '', slug: '', parent_id: null, is_active: true })}>New category</Btn>}
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {cats.loading && !cats.data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <Card title="Top-level order">
            <SortableList items={parents} getId={(c) => c.id} getLabel={(c) => c.name} onReorder={(l) => void reorder(l)} renderItem={row} />
          </Card>
          {parents.map((p) => {
            const kids = childrenOf(p.id);
            if (!kids.length) return null;
            return (
              <Card key={p.id} title={`${p.name}: sub-categories`}>
                <SortableList items={kids} getId={(c) => c.id} getLabel={(c) => c.name} onReorder={(l) => void reorder(l)} renderItem={row} />
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit category' : draft?.parent_id ? 'New sub-category' : 'New category'}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <LabeledField label="Name">
              {(fid) => <input id={fid} className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} />}
            </LabeledField>
            <LabeledField label="Slug" hint={`Shop address: /category/${draft.slug || '…'}`}>
              {(fid) => <input id={fid} className={inputCls} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />}
            </LabeledField>
            <LabeledField label="Parent" hint="Sub-categories sit under one top-level category.">
              {(fid) => (
                <select
                  id={fid}
                  className={inputCls}
                  value={draft.parent_id ?? ''}
                  disabled={Boolean(draft.id && childrenOf(draft.id).length)}
                  onChange={(e) => setDraft({ ...draft, parent_id: e.target.value || null })}
                >
                  <option value="">None (top level)</option>
                  {parents.filter((p) => p.id !== draft.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </LabeledField>
            <LabeledField label="Description">
              {(fid) => <textarea id={fid} rows={2} className={inputCls} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />}
            </LabeledField>
            <ImageField label="Image" value={draft.image_url ?? null} folder="categories" aspect="aspect-square max-w-48" onChange={(url) => setDraft({ ...draft, image_url: url })} />
            <Toggle label="Active" checked={draft.is_active ?? true} onChange={(v) => setDraft({ ...draft, is_active: v })} />
          </div>
        )}
      </Modal>
    </>
  );
}
