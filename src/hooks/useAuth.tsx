import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  /** True once the initial session lookup has settled. */
  ready: boolean;
  /** Confirmed against the admin_users table, not just "is signed in". */
  isAdmin: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Local-provider dev mode: no Supabase, so the dashboard opens unauthenticated. */
const DEV_OPEN_ACCESS = !isSupabaseConfigured;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(DEV_OPEN_ACCESS);
  const [ready, setReady] = useState(DEV_OPEN_ACCESS);

  const verifyAdmin = useCallback(async (current: Session | null) => {
    if (!supabase || !current?.user) {
      setIsAdmin(false);
      return;
    }
    // Authorisation is decided by the database (RLS-protected table), never
    // by a client-side flag.
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', current.user.id)
      .maybeSingle();
    setIsAdmin(!error && Boolean(data));
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await verifyAdmin(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      await verifyAdmin(next);
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [verifyAdmin]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      ready,
      isAdmin,
      configured: isSupabaseConfigured,
      signIn,
      signOut,
    }),
    [session, ready, isAdmin, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
