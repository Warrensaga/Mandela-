import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { GuideRow } from '../../lib/database.types';
import { ApiError, deleteGuide, listGuides, saveGuide } from '../../lib/api/admin';
import { slugify } from '../../lib/admin/labels';
import { formatLongDate } from '../../lib/format';
import { ImageField } from '../components/ImageField';
import { Badge, Btn, Card, Empty, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

type Draft = Partial<GuideRow> & { title: string; slug: string; body_markdown: string };

export default function GuidesPage() {
  const guides = useAsync(listGuides, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) return setMsg({ kind: 'error', text: 'Enter a title and a valid slug.' });
    try {
      const publishing = draft.is_published ?? false;
      await saveGuide({
        ...(draft.id ? { id: draft.id } : {}),
        title: draft.title.trim(),
        slug: draft.slug,
        excerpt: draft.excerpt?.trim() || null,
        body_markdown: draft.body_markdown,
        cover_image_url: draft.cover_image_url ?? null,
        is_published: publishing,
        published_at: publishing ? (draft.published_at ?? new Date().toISOString()) : (draft.published_at ?? null),
      });
      setDraft(null);
      setMsg({ kind: 'success', text: 'Guide saved.' });
      guides.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    }
  };

  return (
    <>
      <PageHeader
        title="Guides"
        description="Care and buying guides for SEO. Write in Markdown: # title, ## sections, **bold**, *italics*, [links](/category/sofas). The public pages arrive in Phase 4."
        actions={<Btn onClick={() => setDraft({ title: '', slug: '', body_markdown: '', is_published: false })}>New guide</Btn>}
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {guides.loading && !guides.data ? (
        <Loading />
      ) : !guides.data?.length ? (
        <Empty>No guides yet.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-paper-200">
            {guides.data.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-800">{g.title}</p>
                  <p className="text-xs text-muted">/guides/{g.slug}{g.published_at ? ` · ${formatLongDate(g.published_at)}` : ''}</p>
                </div>
                {g.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
                <Btn variant="secondary" onClick={() => setDraft({ ...g })}>Edit</Btn>
                <Btn variant="danger" onClick={() => { if (window.confirm(`Delete "${g.title}"?`)) void deleteGuide(g.id).then(guides.reload); }}>Delete</Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit guide' : 'New guide'}
        wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn onClick={() => void save()}>Save</Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-3">
            <LabeledField label="Title">{(fid) => <input id={fid} className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} />}</LabeledField>
            <LabeledField label="Slug">{(fid) => <input id={fid} className={inputCls} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />}</LabeledField>
            <LabeledField label="Excerpt" hint="One or two sentences for the guides list and search results.">
              {(fid) => <textarea id={fid} rows={2} className={inputCls} value={draft.excerpt ?? ''} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />}
            </LabeledField>
            <ImageField label="Cover image" value={draft.cover_image_url ?? null} folder="guides" onChange={(url) => setDraft({ ...draft, cover_image_url: url })} />
            <LabeledField label="Body (Markdown)">
              {(fid) => <textarea id={fid} rows={16} className={`${inputCls} font-mono text-xs`} value={draft.body_markdown} onChange={(e) => setDraft({ ...draft, body_markdown: e.target.value })} />}
            </LabeledField>
            <Toggle label="Published" checked={draft.is_published ?? false} onChange={(v) => setDraft({ ...draft, is_published: v })} />
          </div>
        )}
      </Modal>
    </>
  );
}
