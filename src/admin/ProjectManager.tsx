import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { Project, ProjectDraft } from '@/types';
import { content } from '@/services/content';
import { EmptyState, Skeleton } from '@/components/primitives';
import { cx, formatDate, reorder, slugify } from '@/lib/utils';
import { Button, IconButton, Panel } from './ui';
import { useAdminResource } from './useAdminData';

function emptyDraft(sortOrder: number): ProjectDraft {
  return {
    title: 'Untitled project',
    slug: `untitled-${Date.now().toString(36)}`,
    short_description: '',
    full_description: '',
    cover_image: null,
    cover_alt: '',
    video_url: null,
    technologies: [],
    category: 'Artificial Intelligence',
    year: String(new Date().getFullYear()),
    project_url: null,
    github_url: null,
    featured: false,
    published: false,
    sort_order: sortOrder,
  };
}

export function ProjectManager() {
  const navigate = useNavigate();
  const { data, loading, error, mutate, setData } = useAdminResource(() => content.listProjects());
  const [busy, setBusy] = useState<string | null>(null);

  const projects = data ?? [];

  async function create() {
    setBusy('new');
    try {
      const created = await content.createProject(emptyDraft(projects.length));
      navigate(`/admin/projects/${created.id}`);
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(project: Project) {
    setBusy(project.id);
    const { id, created_at, updated_at, images, ...rest } = project;
    void id;
    void created_at;
    void updated_at;
    void images;
    await mutate(() =>
      content.createProject({
        ...rest,
        title: `${project.title} (copy)`,
        slug: `${slugify(project.title)}-copy-${Date.now().toString(36)}`,
        published: false,
        featured: false,
        sort_order: projects.length,
      }),
    );
    setBusy(null);
  }

  async function toggle(project: Project, field: 'published' | 'featured') {
    setBusy(project.id);
    await mutate(() => content.updateProject(project.id, { [field]: !project[field] }));
    setBusy(null);
  }

  async function remove(project: Project) {
    if (
      !window.confirm(
        `Delete “${project.title}”? It will disappear from the public site immediately. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(project.id);
    await mutate(() => content.deleteProject(project.id));
    setBusy(null);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const next = reorder(projects, index, target).map((p, i) => ({ ...p, sort_order: i }));
    setData(next); // optimistic
    await mutate(() => content.reorderProjects(next.map((p) => p.id)));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-xs">Content</p>
          <h1 className="mt-3 text-3xl tracking-tightest sm:text-4xl">Projects</h1>
          <p className="mt-2 text-sm text-white/40">
            Order here is the order visitors see. Unpublished projects stay hidden.
          </p>
        </div>
        <Button onClick={() => void create()} disabled={busy === 'new'}>
          <Plus size={15} aria-hidden="true" />
          New project
        </Button>
      </header>

      <Panel>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-300/80">{error}</p>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet."
            hint="Create your first project — it appears on the public site as soon as you publish it."
            action={
              <Button onClick={() => void create()}>
                <Plus size={15} aria-hidden="true" />
                New project
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-white/[0.07]">
            {projects.map((project, index) => (
              <li
                key={project.id}
                className={cx(
                  'flex flex-wrap items-center gap-4 py-4 transition-opacity',
                  busy === project.id && 'opacity-50',
                )}
              >
                {/* Thumbnail */}
                <div
                  className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10"
                  style={{ backgroundColor: 'var(--surface-2)' }}
                >
                  {project.cover_image ? (
                    <img
                      src={project.cover_image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                {/* Meta */}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm text-white/90">
                    {project.featured && (
                      <Star size={12} className="shrink-0 text-amber-200/80" aria-hidden="true" />
                    )}
                    {project.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/30">
                    /{project.slug} · {project.category} · updated {formatDate(project.updated_at)}
                  </p>
                </div>

                <span
                  className={cx(
                    'shrink-0 rounded-full px-3 py-1 text-[11px]',
                    project.published
                      ? 'bg-emerald-400/10 text-emerald-200/80'
                      : 'bg-white/[0.05] text-white/40',
                  )}
                >
                  {project.published ? 'Published' : 'Draft'}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label="Move up"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    onClick={() => void move(index, 1)}
                    disabled={index === projects.length - 1}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={project.featured ? 'Unfeature' : 'Mark as featured'}
                    onClick={() => void toggle(project, 'featured')}
                  >
                    <Star
                      size={14}
                      aria-hidden="true"
                      className={project.featured ? 'fill-current text-amber-200/80' : ''}
                    />
                  </IconButton>
                  <IconButton
                    label={project.published ? 'Unpublish' : 'Publish'}
                    onClick={() => void toggle(project, 'published')}
                  >
                    {project.published ? (
                      <Eye size={14} aria-hidden="true" />
                    ) : (
                      <EyeOff size={14} aria-hidden="true" />
                    )}
                  </IconButton>
                  <IconButton label="Duplicate" onClick={() => void duplicate(project)}>
                    <Copy size={14} aria-hidden="true" />
                  </IconButton>
                  <Link
                    to={`/admin/projects/${project.id}`}
                    aria-label={`Edit ${project.title}`}
                    title="Edit"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </Link>
                  <IconButton label="Delete" danger onClick={() => void remove(project)}>
                    <Trash2 size={14} aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
