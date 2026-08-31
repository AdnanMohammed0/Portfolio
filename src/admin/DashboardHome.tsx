import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Star } from 'lucide-react';
import type { MediaItem, Project } from '@/types';
import { content } from '@/services/content';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Skeleton } from '@/components/primitives';
import { formatDate } from '@/lib/utils';
import { Panel } from './ui';

interface Stat {
  label: string;
  value: number;
  to: string;
}

export function DashboardHome() {
  const { data: publicData } = usePortfolio();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([content.listProjects(), content.listMedia()])
      .then(([p, m]) => {
        if (!active) return;
        setProjects(p);
        setMedia(m);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Failed to load');
      });
    return () => {
      active = false;
    };
  }, []);

  const stats: Stat[] = [
    { label: 'Total projects', value: projects?.length ?? 0, to: '/admin/projects' },
    {
      label: 'Featured',
      value: projects?.filter((p) => p.featured).length ?? 0,
      to: '/admin/projects',
    },
    {
      label: 'Published',
      value: projects?.filter((p) => p.published).length ?? 0,
      to: '/admin/projects',
    },
    { label: 'Media files', value: media?.length ?? 0, to: '/admin/media' },
    { label: 'Skills', value: publicData.skills.length, to: '/admin/skills' },
    { label: 'Experience', value: publicData.experience.length, to: '/admin/experience' },
  ];

  const recent = [...(projects ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const updated = [...(projects ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <p className="label-xs">Overview</p>
        <h1 className="mt-3 text-3xl tracking-tightest sm:text-4xl">Portfolio at a glance</h1>
      </header>

      {error && <p className="text-sm text-red-300/80">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="liquid-glass group rounded-2xl p-5 transition-transform duration-500 hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            {projects === null ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <p className="text-3xl tabular-nums tracking-tight text-white">
                {String(stat.value).padStart(2, '0')}
              </p>
            )}
            <p className="label-xs mt-2 normal-case tracking-normal text-white/35">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent projects" description="Newest first">
          {projects === null ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-white/35">
              No projects yet.{' '}
              <Link to="/admin/projects" className="text-white/70 underline-offset-4 hover:underline">
                Create your first one.
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {recent.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="group flex items-center justify-between gap-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-sm text-white/85">
                        {project.featured && (
                          <Star size={12} className="shrink-0 text-amber-200/70" aria-hidden="true" />
                        )}
                        {project.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-white/30">
                        {project.published ? 'Published' : 'Draft'} ·{' '}
                        {formatDate(project.created_at)}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={15}
                      aria-hidden="true"
                      className="shrink-0 text-white/20 transition-colors group-hover:text-white/70"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent updates" description="Most recently edited">
          {projects === null ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : updated.length === 0 ? (
            <p className="text-sm text-white/35">Nothing edited yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {updated.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate text-sm text-white/75">{project.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-white/30">
                    {formatDate(project.updated_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
