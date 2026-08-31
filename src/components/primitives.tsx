import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

/** Centred responsive shell, max 1400px. */
export function Container({
  as: Tag = 'div',
  className,
  children,
  ...rest
}: { as?: ElementType; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cx('shell', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Reusable liquid-glass surface. */
export function LiquidGlass({
  className,
  strong = false,
  noise = false,
  children,
  ...rest
}: {
  className?: string;
  strong?: boolean;
  noise?: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'liquid-glass rounded-2xl',
        strong && 'liquid-glass-strong',
        noise && 'noise-overlay',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Standalone noise layer for sections that are not glass cards. */
export function NoiseOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('noise-overlay pointer-events-none absolute inset-0', className)}
    />
  );
}

/** Small uppercase eyebrow used above every section heading. */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cx('label-xs flex items-center gap-3', className)}>
      {index && <span className="text-white/25 tabular-nums">{index}</span>}
      <span className="h-px w-8 bg-white/15" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function SectionHeading({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cx(
        'text-balance text-[clamp(2rem,5.2vw,4rem)] leading-[1.02] tracking-tightest',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <LiquidGlass className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-white/25">{icon}</div>}
      <p className="text-lg text-white/80">{title}</p>
      {hint && <p className="max-w-sm text-sm text-white/40">{hint}</p>}
      {action && <div className="pt-2">{action}</div>}
    </LiquidGlass>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/45" role="status">
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border border-white/20 border-t-white/80"
      />
      {label}
    </div>
  );
}
