import { useState } from 'react';
import type { ProductImageRow } from '../../../lib/database.types';
import { addProductImage, addProductImageUrl, ApiError, deleteProductImage, setSortOrder, updateProductImage } from '../../../lib/api/admin';
import { ACCEPTED_IMAGE_TYPES } from '../../../lib/admin/imageResize';
import { validateImageUrl } from '../../../lib/admin/imageUrl';
import { SortableList } from '../../components/SortableList';
import { Btn, Card, Empty, inputCls, Notice } from '../../components/ui';

interface Props {
  productId: string;
  productName: string;
  images: ProductImageRow[];
  onChange: (images: ProductImageRow[]) => void;
}

/** Multi-image upload (resized to WebP) or add by link, drag to reorder, alt text, delete. First image is the main photo. */
export function ProductImages({ productId, productName, images, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [added, setAdded] = useState<string | null>(null);

  /** Adds one or more photos by link (one link per line, or separated by spaces). */
  const addByLink = async () => {
    const links = link.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
    if (!links.length) return;
    setError(null);
    setAdded(null);
    let list = [...images];
    const failedLinks: string[] = [];
    const messages: string[] = [];
    for (const [i, raw] of links.entries()) {
      setBusy(`Checking link ${i + 1} of ${links.length}…`);
      try {
        const url = await validateImageUrl(raw);
        if (list.some((img) => img.url === url)) throw new Error('This photo is already on the product.');
        const row = await addProductImageUrl(productId, url, productName, list.length);
        list = [...list, row];
        onChange(list);
      } catch (e) {
        failedLinks.push(raw);
        messages.push(`${raw.length > 60 ? `${raw.slice(0, 60)}…` : raw}: ${e instanceof Error ? e.message : 'could not add'}`);
      }
    }
    setBusy(null);
    const ok = links.length - failedLinks.length;
    if (ok) setAdded(`Added ${ok} photo${ok === 1 ? '' : 's'} from link${ok === 1 ? '' : 's'}.`);
    if (messages.length) setError(messages.join('\n'));
    // Keep only the links that failed, so they can be fixed and retried.
    setLink(failedLinks.join('\n'));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    let list = [...images];
    let i = 0;
    for (const file of Array.from(files)) {
      i += 1;
      setBusy(`Uploading ${i} of ${files.length}…`);
      try {
        const row = await addProductImage(productId, file, productName, list.length);
        list = [...list, row];
        onChange(list);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
      }
    }
    setBusy(null);
  };

  const reorder = async (next: ProductImageRow[]) => {
    const previous = images;
    onChange(next.map((img, i) => ({ ...img, sort_order: i + 1 })));
    try {
      await setSortOrder('product_images', next.map((i) => i.id));
    } catch (e) {
      onChange(previous);
      setError(e instanceof ApiError ? e.message : 'Could not save the order.');
    }
  };

  const remove = async (img: ProductImageRow) => {
    if (!window.confirm('Delete this photo? Variants using it will fall back to the main photo.')) return;
    try {
      await deleteProductImage(img);
      onChange(images.filter((i) => i.id !== img.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete the photo.');
    }
  };

  return (
    <Card
      title="Photos"
      actions={
        <label className="cursor-pointer rounded-lg border border-paper-300 bg-white px-3 py-1.5 text-sm text-navy-800 hover:bg-paper-100">
          Upload photos
          <input
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      }
    >
      {error && (
        <Notice kind="error" onDismiss={() => setError(null)}>
          <span className="whitespace-pre-line">{error}</span>
        </Notice>
      )}
      {added && <Notice kind="success" onDismiss={() => setAdded(null)}>{added}</Notice>}
      {busy && <Notice kind="info">{busy}</Notice>}
      <p className="mb-3 text-xs text-muted">
        Upload files from your phone or computer (resized to WebP at 400, 800 and 1200px in your browser), or add photos by link below. The first photo is the main one.
      </p>
      <form
        className="mb-4 rounded-lg border border-paper-200 bg-paper-50 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void addByLink();
        }}
      >
        <label htmlFor="photo-links" className="mb-1 block text-xs font-medium text-navy-800">
          Add photos by link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <textarea
            id="photo-links"
            rows={link.includes('\n') ? 3 : 1}
            className={`${inputCls} resize-y font-mono text-xs`}
            placeholder="https://example.com/photo.jpg  (one link per line to add several)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void addByLink();
              }
            }}
          />
          <Btn type="submit" variant="secondary" disabled={busy !== null || !link.trim()} className="shrink-0">
            Add by link
          </Btn>
        </div>
        <p className="mt-1 text-xs text-muted">
          Use a direct image link (it should open as just the picture). Linked photos stay on the other website: if it removes them, they disappear from your shop, so uploading is safer for the long term. Shift+Enter adds another line.
        </p>
      </form>
      {images.length === 0 ? (
        <Empty>No photos yet.</Empty>
      ) : (
        <SortableList
          items={images}
          getId={(i) => i.id}
          getLabel={(i) => i.alt_text ?? 'photo'}
          onReorder={(next) => void reorder(next)}
          renderItem={(img) => (
            <div className="flex items-center gap-3">
              <img src={img.url} alt="" className="h-14 w-14 shrink-0 rounded object-cover sm:w-20" />
              <input
                aria-label="Alt text"
                className={`${inputCls} min-w-0`}
                defaultValue={img.alt_text ?? ''}
                placeholder="Describe the photo for screen readers"
                onBlur={(e) => {
                  if (e.target.value !== (img.alt_text ?? '')) {
                    void updateProductImage(img.id, { alt_text: e.target.value || null }).catch(() => setError('Could not save alt text.'));
                  }
                }}
              />
              <Btn variant="danger" onClick={() => void remove(img)}>Delete</Btn>
            </div>
          )}
        />
      )}
    </Card>
  );
}
