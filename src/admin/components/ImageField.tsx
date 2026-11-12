import { useId, useState } from 'react';
import { uploadPublicImage } from '../../lib/api/admin';
import { ACCEPTED_IMAGE_TYPES } from '../../lib/admin/imageResize';
import { validateImageUrl } from '../../lib/admin/imageUrl';
import { Btn, inputCls } from './ui';

interface ImageFieldProps {
  label: string;
  value: string | null;
  folder: string;
  onChange: (url: string | null) => void;
  hint?: string;
  aspect?: string;
}

/**
 * Single image for categories, hero slides and guides: upload a file (resized
 * to WebP) or paste a direct image link. Shows a preview either way.
 */
export function ImageField({ label, value, folder, onChange, hint, aspect = 'aspect-video' }: ImageFieldProps) {
  const linkId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy('Uploading…');
    setError(null);
    try {
      onChange(await uploadPublicImage(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const applyLink = async () => {
    if (!link.trim()) return;
    setBusy('Checking link…');
    setError(null);
    try {
      onChange(await validateImageUrl(link));
      setLink('');
      setShowLink(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That link could not be used.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-navy-800">{label}</p>
      <div className={`relative w-full overflow-hidden rounded-lg border border-paper-300 bg-paper-100 ${aspect}`}>
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-muted">No image</span>
        )}
        {busy && <span className="absolute inset-0 grid place-items-center bg-white/70 text-sm">{busy}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-paper-300 bg-white px-3 py-1.5 text-sm text-navy-800 hover:bg-paper-100">
          {value ? 'Upload new' : 'Upload'}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            disabled={busy !== null}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <Btn variant="secondary" onClick={() => setShowLink((s) => !s)} disabled={busy !== null} aria-expanded={showLink}>
          Use a link
        </Btn>
        {value && (
          <Btn variant="ghost" onClick={() => onChange(null)} disabled={busy !== null}>
            Remove
          </Btn>
        )}
      </div>
      {showLink && (
        <div className="mt-2 flex gap-2">
          <label htmlFor={linkId} className="sr-only">Image link</label>
          <input
            id={linkId}
            type="url"
            inputMode="url"
            className={`${inputCls} font-mono text-xs`}
            placeholder="https://example.com/photo.jpg"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void applyLink();
              }
            }}
          />
          <Btn onClick={() => void applyLink()} disabled={busy !== null || !link.trim()}>
            Use
          </Btn>
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-terracotta-600" role="alert">{error}</p>}
    </div>
  );
}
