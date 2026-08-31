import { Hand } from 'lucide-react';

/**
 * Shown instead of the 3D hand when WebGL is unavailable, the scene fails to
 * load, or while the chunk is still arriving. A failure here never breaks the
 * hero — the copy and CTAs are untouched.
 */
export function HandFallback({ reason }: { reason: 'loading' | 'unsupported' | 'error' }) {
  const label =
    reason === 'loading'
      ? 'Preparing the hand'
      : reason === 'unsupported'
        ? '3D is unavailable on this device'
        : 'The hand could not be loaded';

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      role="img"
      aria-label={reason === 'loading' ? 'Loading interactive hand' : label}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={
            'liquid-glass flex h-28 w-28 items-center justify-center rounded-full text-white/30 ' +
            (reason === 'loading' ? 'animate-drift' : '')
          }
        >
          <Hand size={38} strokeWidth={1} aria-hidden="true" />
        </div>
        {reason !== 'loading' && (
          <p className="max-w-[14rem] text-center text-[11px] leading-relaxed text-white/30">
            {label}.
          </p>
        )}
      </div>
    </div>
  );
}
