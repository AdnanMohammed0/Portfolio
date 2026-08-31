import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { MediaItem } from '@/types';
import { MediaManager } from './MediaManager';

interface Props {
  open: boolean;
  title?: string;
  selectedUrls?: string[];
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}

/** Modal wrapper around the media library, used for cover and gallery picking. */
export function MediaPicker({ open, title = 'Select media', selectedUrls, onClose, onSelect }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="liquid-glass relative w-full max-w-4xl rounded-2xl p-5 sm:p-7"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-lg tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <MediaManager compact selectedUrls={selectedUrls} onSelect={onSelect} />
      </div>
    </div>
  );
}
