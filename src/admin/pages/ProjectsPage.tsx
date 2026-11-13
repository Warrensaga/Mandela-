import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { ProjectRow } from '../../lib/database.types';
import { ApiError, deleteProject, deletePublicImage, listAllProjects, saveProject, setSortOrder, uploadPublicImage } from '../../lib/api/admin';
import { ACCEPTED_IMAGE_TYPES } from '../../lib/admin/imageResize';
import { slugify } from '../../lib/admin/labels';
import { formatLongDate } from '../../lib/format';
import { ImageField } from '../components/ImageField';
import { SortableList } from '../components/SortableList';
import { Badge, Btn, Card, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, Toggle } from '../components/ui';

const MAX_GALLERY = 40;
/** Suggestions only; the owner can type anything. */
const SPACE_TYPES = ['Home', 'Apartment', 'Airbnb / rental', 'Office', 'Hotel', 'Restaurant / café', 'School', 'Church', 'Other'];

type Draft = {
  id?: string;
  title: string;
  slug: string;
  space_type: string;
  location: string;
  completed_on: string;
  summary: string;
  body: string;
  scope: string;
  cover_image_url: string | null;
  gallery: string[];
  is_published: boolean;
};

const toDraft = (p?: ProjectRow): Draft => ({
  id: p?.id,
  title: p?.title ?? '',
  slug: p?.slug ?? '',
  space_type: p?.space_type ?? '',
  location: p?.location ?? '',
  completed_on: p?.completed_on ?? '',
  summary: p?.summary ?? '',
  body: p?.body ?? '',
  scope: (p?.scope ?? []).join(', '),
  cover_image_url: p?.cover_image_url ?? null,
  gallery: p?.gallery ?? [],
  is_published: p?.is_published ?? false,
});

/** Several photos at once, plus reorder (move earlier/later) and remove. */
function GalleryEditor({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_GALLERY - value.length;
    const list = [...files].slice(0, room);
    setError(files.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} can be added (${MAX_GALLERY} max).` : null);
    let urls = value;
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try {
        urls = [...urls, await uploadPublicImage(file, 'projects')];
        onChange(urls);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
        break;
      }
    }
    setBusy(null);
  };

  const move = (i: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item!);
    onChange(next);
  };

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-navy-800">Gallery photos ({value.length}/{MAX_GALLERY})</p>
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <li key={url} className="overflow-hidden rounded-lg border border-paper-300 bg-paper-100">
              <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-1 p-1">
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-paper-200 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`}>←</button>
                <button type="button" className="rounded px-2 py-1 text-xs text-terracotta-600 hover:bg-paper-200" onClick={() => onChange(value.filter((u) => u !== url))} aria-label={`Remove photo ${i + 1}`}>Remove</button>
                <button type="button" className="rounded px-2 py-1 text-xs hover:bg-paper-200 disabled:opacity-30" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`}>→</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer rounded-lg border border-paper-300 bg-white px-3 py-1.5 text-sm text-navy-800 hover:bg-paper-100 ${busy || value.length >= MAX_GALLERY ? 'pointer-events-none opacity-50' : ''}`}>
          Add photos
          <input
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            disabled={busy !== null || value.length >= MAX_GALLERY}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {busy && <span className="text-sm text-muted">{busy}</span>}
        <span className="text-xs text-muted">Photos are resized for phones automatically. Choose several at once.</span>
      </div>
      {error && <p className="mt-1 text-xs text-terracotta-600" role="alert">{error}</p>}
    </div>
  );
}

export default function ProjectsPage() {
  const projects = useAsync(listAllProjects, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const save = async () => {
    if (!draft) return;
    const problems: string[] = [];
    if (draft.title.trim().length < 2) problems.push('Enter a title.');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) problems.push('The web address may use lowercase letters, numbers and dashes only.');
    if (draft.is_published && !draft.cover_image_url && !draft.gallery.length) problems.push('Add at least one photo before publishing.');
    if (draft.summary.length > 400) problems.push('Keep the summary under 400 characters.');
    if (problems.length) return setMsg({ kind: 'error', text: problems.join(' ') });

    setSaving(true);
    try {
      await saveProject({
        ...(draft.id ? { id: draft.id } : { sort_order: projects.data?.length ?? 0 }),
        title: draft.title.trim(),
        slug: draft.slug,
        space_type: draft.space_type.trim() || null,
        location: draft.location.trim() || null,
        completed_on: draft.completed_on || null,
        summary: draft.summary.trim() || null,
        body: draft.body.trim() || null,
        scope: [...new Set(draft.scope.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 30),
        cover_image_url: draft.cover_image_url ?? draft.gallery[0] ?? null,
        gallery: draft.gallery,
        is_published: draft.is_published,
      });
      setDraft(null);
      setMsg({ kind: 'success', text: draft.is_published ? 'Project saved and published.' : 'Project saved as a draft (not visible on the site).' });
      projects.reload();
    } catch (e) {
      const text = e instanceof ApiError ? e.message : 'Could not save.';
      setMsg({ kind: 'error', text: /duplicate|unique/i.test(text) ? 'Another project already uses that web address. Change the slug.' : text });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: ProjectRow) => {
    if (!window.confirm(`Delete "${p.title}" and its photos? This cannot be undone.`)) return;
    try {
      await deleteProject(p.id);
      await Promise.allSettled([p.cover_image_url, ...p.gallery].filter((u): u is string => Boolean(u)).map(deletePublicImage));
      setMsg({ kind: 'success', text: 'Project deleted.' });
      projects.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not delete.' });
    }
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Homes, offices and other spaces you have furnished, with your own photos. Published projects appear on the Projects page and on the home page. Drag to change the order."
        actions={<Btn onClick={() => setDraft(toDraft())}>New project</Btn>}
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {projects.loading && !projects.data ? (
        <Loading />
      ) : !projects.data?.length ? (
        <Card>
          <p className="text-sm text-muted">No projects yet. Until you publish one, the Projects page explains your furnishing service and the home page leaves the section out.</p>
        </Card>
      ) : (
        <Card>
          <SortableList
            items={projects.data}
            getId={(p) => p.id}
            getLabel={(p) => p.title}
            onReorder={(l) => void setSortOrder('projects', l.map((p) => p.id)).then(projects.reload)}
            renderItem={(p) => (
              <div className="flex flex-wrap items-center gap-3">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <span className="grid h-12 w-16 shrink-0 place-items-center rounded bg-paper-200 text-[10px] text-muted">No photo</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-800">{p.title}</p>
                  <p className="text-xs text-muted">
                    /projects/{p.slug}
                    {[p.space_type, p.location].filter(Boolean).length ? ` · ${[p.space_type, p.location].filter(Boolean).join(', ')}` : ''}
                    {p.completed_on ? ` · ${formatLongDate(p.completed_on)}` : ''} · {p.gallery.length} photo{p.gallery.length === 1 ? '' : 's'}
                  </p>
                </div>
                {p.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
                {p.is_published && (
                  <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-navy-800 underline">View</a>
                )}
                <Btn variant="secondary" onClick={() => setDraft(toDraft(p))}>Edit</Btn>
                <Btn variant="danger" onClick={() => void remove(p)}>Delete</Btn>
              </div>
            )}
          />
        </Card>
      )}

      <Modal
        open={draft !== null}
        onClose={() => !saving && setDraft(null)}
        title={draft?.id ? 'Edit project' : 'New project'}
        wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDraft(null)} disabled={saving}>Cancel</Btn>
            <Btn onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledField label="Title" hint="For example: Three-bedroom apartment, Kilimani">
                {(fid) => (
                  <input id={fid} className={inputCls} value={draft.title} maxLength={120}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} />
                )}
              </LabeledField>
              <LabeledField label="Web address (slug)" hint={`Shows as /projects/${draft.slug || '…'}`}>
                {(fid) => <input id={fid} className={inputCls} value={draft.slug} maxLength={120} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Type of space">
                {(fid) => (
                  <>
                    <input id={fid} list={`${fid}-types`} className={inputCls} value={draft.space_type} maxLength={60} placeholder="Home, Office, Airbnb…" onChange={(e) => setDraft({ ...draft, space_type: e.target.value })} />
                    <datalist id={`${fid}-types`}>{SPACE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
                  </>
                )}
              </LabeledField>
              <LabeledField label="Location" hint="Area and town, e.g. Karen, Nairobi. Leave out house numbers.">
                {(fid) => <input id={fid} className={inputCls} value={draft.location} maxLength={120} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />}
              </LabeledField>
              <LabeledField label="Completed (optional)">
                {(fid) => <input id={fid} type="date" className={inputCls} value={draft.completed_on} onChange={(e) => setDraft({ ...draft, completed_on: e.target.value })} />}
              </LabeledField>
              <LabeledField label="What you supplied" hint="Separate with commas: Sofas, Beds, Curtains, Dining set">
                {(fid) => <input id={fid} className={inputCls} value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })} />}
              </LabeledField>
            </div>
            <LabeledField label="Summary" hint={`One or two sentences for the project list and search results (${draft.summary.length}/400).`}>
              {(fid) => <textarea id={fid} rows={2} className={inputCls} value={draft.summary} maxLength={400} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />}
            </LabeledField>
            <LabeledField label="The story (optional)" hint="What the client needed and what you made or supplied. Leave a blank line between paragraphs.">
              {(fid) => <textarea id={fid} rows={7} className={inputCls} value={draft.body} maxLength={8000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />}
            </LabeledField>
            <ImageField
              label="Cover photo"
              hint="Shown on the project list. If you leave it empty, the first gallery photo is used."
              value={draft.cover_image_url}
              folder="projects"
              aspect="aspect-[4/3]"
              onChange={(url) => setDraft({ ...draft, cover_image_url: url })}
            />
            <GalleryEditor value={draft.gallery} onChange={(gallery) => setDraft((d) => (d ? { ...d, gallery } : d))} />
            <Toggle label="Published (visible on the website)" checked={draft.is_published} onChange={(v) => setDraft({ ...draft, is_published: v })} />
            <p className="text-xs text-muted">Only use photos you took or have permission to use, and ask clients before showing their home.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
