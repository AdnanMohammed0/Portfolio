import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Briefcase,
  ExternalLink,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usingLocalProvider } from '@/services/content';
import { cx } from '@/lib/utils';
import { Notice } from './ui';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Projects', icon: Briefcase },
  { to: '/admin/media', label: 'Media', icon: Image },
  { to: '/admin/hero', label: 'Hero', icon: Sparkles },
  { to: '/admin/about', label: 'About Me', icon: User },
  { to: '/admin/skills', label: 'Skills', icon: Wrench },
  { to: '/admin/experience', label: 'Experience', icon: Briefcase },
  { to: '/admin/contact', label: 'Contact', icon: Mail },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <p className="text-sm tracking-[0.14em] text-white">Dashboard</p>
        <p className="mt-1 truncate text-xs text-white/30">
          {user?.email ?? (usingLocalProvider ? 'Local demo mode' : 'Signed in')}
        </p>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-300',
                isActive ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:text-white/85',
              )
            }
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/[0.07] p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 transition-colors hover:text-white"
        >
          <ExternalLink size={16} aria-hidden="true" />
          View site
        </a>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 transition-colors hover:text-white"
        >
          <LogOut size={16} aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.07] bg-black/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <p className="text-sm tracking-[0.14em]">Dashboard</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close dashboard menu' : 'Open dashboard menu'}
          className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full text-white/70"
        >
          {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside
            className="absolute inset-y-0 left-0 w-72 border-r border-white/[0.07] bg-[#0a0a0a]"
            aria-label="Dashboard navigation"
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[17rem_1fr]">
        <aside
          className="sticky top-0 hidden h-screen border-r border-white/[0.07] bg-[#0a0a0a] lg:block"
          aria-label="Dashboard navigation"
        >
          {sidebar}
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
          {usingLocalProvider && (
            <div className="mb-6">
              <Notice>
                <strong className="font-normal text-amber-50">Local demo mode.</strong> Supabase is
                not configured, so content is stored in this browser only and uploads are not
                persisted. Add <code className="text-amber-50">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-amber-50">VITE_SUPABASE_ANON_KEY</code> to{' '}
                <code className="text-amber-50">.env.local</code>, then run the SQL in{' '}
                <code className="text-amber-50">supabase/schema.sql</code>.
              </Notice>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
