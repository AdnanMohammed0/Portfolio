import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cx } from '@/lib/utils';

/** Shared admin chrome: panels, fields, save affordances. */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx('liquid-glass rounded-2xl p-5 sm:p-7', className)}
      style={{ backgroundColor: 'var(--surface)' }}
    >
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg tracking-tight text-white">{title}</h2>}
            {description && <p className="mt-1 text-sm text-white/40">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-xs mb-2 block">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-white/30">{hint}</p>}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  autoComplete,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="field"
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="field resize-y"
    />
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-white/20">
      <span>
        <span className="block text-sm text-white/85">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-white/30">{hint}</span>}
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cx(
            'block h-6 w-11 rounded-full transition-colors duration-300',
            checked ? 'bg-white' : 'bg-white/15',
          )}
        />
        <span
          aria-hidden="true"
          className={cx(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform duration-300',
            checked ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/70',
          )}
        />
      </span>
    </label>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' && 'bg-white text-black hover:opacity-90',
        variant === 'ghost' && 'liquid-glass text-white/75 hover:text-white',
        variant === 'danger' && 'bg-red-500/15 text-red-200 hover:bg-red-500/25',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition-colors duration-300 disabled:opacity-30',
        danger ? 'text-red-300/70 hover:bg-red-500/15' : 'text-white/50 hover:bg-white/5 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Save button plus an inline, self-clearing status line. */
export function SaveBar({
  state,
  error,
  onSave,
  label = 'Save changes',
  extra,
}: {
  state: SaveState;
  error?: string | null;
  onSave: () => void;
  label?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={onSave} disabled={state === 'saving'}>
        {state === 'saving' && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {state === 'saved' && <Check size={15} aria-hidden="true" />}
        {state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : label}
      </Button>
      {extra}
      <p aria-live="polite" className="text-sm">
        {state === 'error' && <span className="text-red-300/80">{error}</span>}
      </p>
    </div>
  );
}

/** Wraps an async save with the state transitions every editor needs. */
export function useSave() {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== 'saved') return;
    const timer = window.setTimeout(() => setState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function run(action: () => Promise<unknown>) {
    setState('saving');
    setError(null);
    try {
      await action();
      setState('saved');
      return true;
    } catch (cause) {
      setState('error');
      setError(cause instanceof Error ? cause.message : 'Save failed');
      return false;
    }
  }

  return { state, error, run };
}

export function Notice({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'info';
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        tone === 'warn'
          ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100/80'
          : 'border-white/10 bg-white/[0.02] text-white/60',
      )}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 opacity-70" aria-hidden="true" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

/** Small confirm gate for destructive actions. */
export function useConfirm() {
  return (message: string) => window.confirm(message);
}
