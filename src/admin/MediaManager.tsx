import { useRef, useState, type ChangeEvent } from 'react';
import { Check, Copy, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { MediaItem } from '@/types';
import { content } from '@/services/content';
import { EmptyState, Skeleton } from '@/components/primitives';
import { cx, formatBytes } from '@/lib/utils';
import { Button, Panel } from './ui';
import { useAdminResource } from './useAdminData';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm';
const MAX_BYTES = 50 * 1024 * 1024;

interface Props {
  /** Selection mode — used by the project editor's pickers. */
  onSelect?: (item: MediaItem) => void;
  selectedUrls?: string[];
  compact?: boolean;
}

export function MediaManager({ onSelect, selectedUrls = [], compact = false }: Props) {
  const { data, loading, error, mutate, reload } = useAdminResource(() => content.listMedia());
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const items = data ?? [];

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => {
      if (file.size > MAX_BYTES) {
        setUploadError(`${file.name} is larger than ${formatBytes(MAX_BYTES)}.`);
        return false;
      }
      return true;
    });
    if (list.length === 0) return;

    setUploading(list.length);
    setUploadError(null);
    try {
      for (const file of list) {
        await content.uploadMedia(file);
        setUploading((n) => n - 1);
      }
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'Upload failed');
    } finally {
      setUploading(0);
      await reload();
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void upload(event.target.files);
    event.target.value = '';
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Delete “${item.name}” permanently? This cannot be undone.`)) return;
    await mutate(() => content.deleteMedia(item));
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setUploadError('Could not copy to clipboard.');
    }
  }

  const dropZone = (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
      }}
      className={cx(
        'rounded-2xl border border-dashed p-6 text-center transition-colors duration-300',
        dragging ? 'border-white/40 bg-white/[0.04]' : 'border-white/12',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={onFileInput}
        className="sr-only"
        id="media-upload"
      />
      <ImagePlus size={22} className="mx-auto text-white/25" aria-hidden="true" />
      <p className="mt-3 text-sm text-white/60">Drop images or videos here</p>
      <p className="mt-1 text-xs text-white/25">
        PNG, JPG, WebP, SVG, MP4, WebM — up to {formatBytes(MAX_BYTES)}
      </p>
      <Button variant="ghost" className="mt-4" onClick={() => inputRef.current?.click()}>
        {uploading > 0 && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {uploading > 0 ? `Uploading ${uploading}` : 'Choose files'}
      </Button>
      {uploadError && <p className="mt-3 text-sm text-red-300/80">{uploadError}</p>}
    </div>
  );

  const grid = loading ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
  ) : error ? (
    <p className="text-sm text-red-300/80">{error}</p>
  ) : items.length === 0 ? (
    <EmptyState title="Upload your first image." hint="Files you upload appear here." />
  ) : (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const selected = selectedUrls.includes(item.url);
        return (
          <li key={item.id} className="group relative">
            <div
              className={cx(
                'liquid-glass relative aspect-square overflow-hidden rounded-2xl transition-all duration-300',
                selected && 'ring-2 ring-white/70',
              )}
              style={{ backgroundColor: 'var(--surface)' }}
            >
              {item.type === 'video' ? (
                <video src={item.url} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <img
                  src={item.url}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}

              {onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-label={`Select ${item.name}`}
                  className="absolute inset-0 bg-black/0 transition-colors duration-300 hover:bg-black/40"
                >
                  <span className="sr-only">Select</span>
                </button>
              )}

              {selected && (
                <span className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                  <Check size={13} aria-hidden="true" />
                </span>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="truncate text-[11px] text-white/70">{item.name}</span>
                <span className="pointer-events-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => void copyUrl(item.url)}
                    aria-label={`Copy URL of ${item.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
                  >
                    {copied === item.url ? (
                      <Check size={12} aria-hidden="true" />
                    ) : (
                      <Copy size={12} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    aria-label={`Delete ${item.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-200 hover:bg-red-500/35"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>
            <p className="mt-1.5 truncate text-[11px] text-white/25">{formatBytes(item.size)}</p>
          </li>
        );
      })}
    </ul>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {dropZone}
        {grid}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="label-xs">Library</p>
        <h1 className="mt-3 text-3xl tracking-tightest sm:text-4xl">Media</h1>
        <p className="mt-2 text-sm text-white/40">
          Images and videos used across the portfolio. Deleting a file here removes it from storage.
        </p>
      </header>

      <Panel>{dropZone}</Panel>
      <Panel title="Files" description={`${items.length} item${items.length === 1 ? '' : 's'}`}>
        {grid}
      </Panel>
    </div>
  );
}
