import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Field, Notice, TextInput } from './ui';

export function LoginPage() {
  const { signIn, user, isAdmin, ready, configured } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && user && isAdmin) {
    const from = (location.state as { from?: string } | null)?.from ?? '/admin';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div
          className="liquid-glass noise-overlay glow-teal relative overflow-hidden rounded-2xl p-7 sm:p-8"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <div className="relative">
            <span className="liquid-glass mb-6 flex h-11 w-11 items-center justify-center rounded-full text-white/60">
              <Lock size={17} aria-hidden="true" />
            </span>

            <h1 className="text-2xl tracking-tight">Dashboard access</h1>
            <p className="mt-2 text-sm text-white/40">
              Sign in to manage the portfolio content.
            </p>

            {!configured && (
              <div className="mt-6">
                <Notice>
                  Supabase is not configured, so there is no account to sign in with. Add your
                  credentials to <code>.env.local</code> and restart the dev server.
                </Notice>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <Field label="Email" id="admin-email">
                <TextInput
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="username"
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="Password" id="admin-password">
                <TextInput
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </Field>

              <button
                type="submit"
                disabled={busy || !configured}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                {busy ? 'Signing in' : 'Sign in'}
              </button>

              <p aria-live="polite" className="min-h-[1.25rem] text-center text-sm">
                {error && <span className="text-red-300/80">{error}</span>}
                {ready && user && !isAdmin && !error && (
                  <span className="text-amber-200/80">
                    This account is not an administrator.
                  </span>
                )}
              </p>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          <a href="/" className="transition-colors hover:text-white/50">
            ← Back to the site
          </a>
        </p>
      </div>
    </div>
  );
}
