import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, ImageIcon, Plus, Trash2, X } from 'lucide-react';
import type { MediaItem, Project, ProjectImage } from '@/types';
import { content } from '@/services/content';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Skeleton } from '@/components/primitives';
import { parseList, reorder, slugify, uid } from '@/lib/utils';
import {
  Button,
  Field,
  IconButton,
  Panel,
  SaveBar,
  TextArea,
  TextInput,
  Toggle,
  useSave,
} from './ui';
import { MediaPicker } from './MediaPicker';

type GalleryImage = Omit<ProjectImage, 'project_id'>;
type PickerTarget = 'cover' | 'gallery' | 'video' | null;

export function ProjectEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { refresh } = usePortfolio();
  const { state, error, run } = useSave();

  const [project, setProject] = useState<Project | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [techInput, setTechInput] = useState('');

  useEffect(() => {
    let active = true;
    content
      .getProject(id)
      .then((found) => {
        if (!active) return;
        if (!found) {
          setLoadError('Project not found.');
          return;
        }
        setProject(found);
        setGallery(found.images ?? []);
        setTechInput(found.technologies.join(', '));
      })
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, [id]);

  const patch = useCallback(<K extends keyof Project>(key: K, value: Project[K]) => {
    setProject((current) => (current ? { ...current, [key]: value } : current));
  }, []);

  async function save() {
    if (!project) return;
    const ok = await run(async () => {
      await content.updateProject(project.id, {
        title: project.title,
        slug: project.slug || slugify(project.title),
        short_description: project.short_description,
        full_description: project.full_description,
        cover_image: project.cover_image,
        cover_alt: project.cover_alt,
        video_url: project.video_url,
        technologies: parseList(techInput),
        category: project.category,
        year: project.year,
        project_url: project.project_url,
        github_url: project.github_url,
        featured: project.featured,
        published: project.published,
        sort_order: project.sort_order,
      });
      await content.setProjectImages(project.id, gallery);
    });
    if (ok) await refresh();
  }

  async function remove() {
    if (!project) return;
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    await content.deleteProject(project.id);
    await refresh();
    navigate('/admin/projects');
  }

  function onPick(item: MediaItem) {
    if (picker === 'cover') {
      patch('cover_image', item.url);
      if (!project?.cover_alt) patch('cover_alt', item.name.replace(/\.[^.]+$/, ''));
    } else if (picker === 'video') {
      patch('video_url', item.url);
    } else if (picker === 'gallery') {
      setGallery((current) => [
        ...current,
        { id: uid('image'), url: item.url, alt: item.name, sort_order: current.length },
      ]);
      return; // keep the picker open for multi-select
    }
    setPicker(null);
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-300/80">{loadError}</p>
        <Link to="/admin/projects" className="text-sm text-white/60 hover:text-white">
          ← Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Projects
          </Link>
          <h1 className="mt-3 truncate text-3xl tracking-tightest sm:text-4xl">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {project.published && (
            <a
              href={`/work/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass rounded-full px-4 py-2.5 text-sm text-white/70 hover:text-white"
            >
              Preview
            </a>
          )}
          <Button variant="danger" onClick={() => void remove()}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---- Main fields ---- */}
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Details">
            <div className="space-y-4">
              <Field label="Title" id="p-title">
                <TextInput
                  id="p-title"
                  value={project.title}
                  onChange={(v) => patch('title', v)}
                />
              </Field>

              <Field label="Slug" id="p-slug" hint={`Public URL: /work/${project.slug}`}>
                <div className="flex gap-2">
                  <TextInput id="p-slug" value={project.slug} onChange={(v) => patch('slug', v)} />
                  <Button variant="ghost" onClick={() => patch('slug', slugify(project.title))}>
                    From title
                  </Button>
                </div>
              </Field>

              <Field label="Short description" id="p-short" hint="Shown on the works grid.">
                <TextArea
                  id="p-short"
                  rows={2}
                  value={project.short_description}
                  onChange={(v) => patch('short_description', v)}
                />
              </Field>

              <Field
                label="Full description"
                id="p-full"
                hint="Shown on the project page. Blank lines start a new paragraph."
              >
                <TextArea
                  id="p-full"
                  rows={8}
                  value={project.full_description}
                  onChange={(v) => patch('full_description', v)}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Gallery"
            description="Extra images shown on the project page."
            actions={
              <Button variant="ghost" onClick={() => setPicker('gallery')}>
                <Plus size={14} aria-hidden="true" />
                Add images
              </Button>
            }
          >
            {gallery.length === 0 ? (
              <p className="text-sm text-white/30">No gallery images yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((image, index) => (
                  <li key={image.id} className="group relative">
                    <div
                      className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10"
                      style={{ backgroundColor: 'var(--surface-2)' }}
                    >
                      <img
                        src={image.url}
                        alt={image.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <input
                        value={image.alt}
                        aria-label={`Alt text for image ${index + 1}`}
                        placeholder="Alt text"
                        onChange={(e) =>
                          setGallery((current) =>
                            current.map((g) =>
                              g.id === image.id ? { ...g, alt: e.target.value } : g,
                            ),
                          )
                        }
                        className="field px-3 py-1.5 text-xs"
                      />
                      <IconButton
                        label="Move left"
                        disabled={index === 0}
                        onClick={() => setGallery((c) => reorder(c, index, index - 1))}
                      >
                        <ArrowLeftRight size={13} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label="Remove image"
                        danger
                        onClick={() => setGallery((c) => c.filter((g) => g.id !== image.id))}
                      >
                        <X size={13} aria-hidden="true" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---- Sidebar ---- */}
        <div className="space-y-4">
          <Panel title="Visibility">
            <div className="space-y-3">
              <Toggle
                label="Published"
                hint="Visible on the public site"
                checked={project.published}
                onChange={(v) => patch('published', v)}
              />
              <Toggle
                label="Featured"
                hint="Gets the large card in Works"
                checked={project.featured}
                onChange={(v) => patch('featured', v)}
              />
            </div>
          </Panel>

          <Panel title="Cover">
            <div
              className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10"
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              {project.cover_image ? (
                <img
                  src={project.cover_image}
                  alt={project.cover_alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/25">
                  <ImageIcon size={22} aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setPicker('cover')}>
                {project.cover_image ? 'Replace' : 'Select'}
              </Button>
              {project.cover_image && (
                <Button variant="ghost" onClick={() => patch('cover_image', null)}>
                  Remove
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Cover alt text" id="p-alt" hint="Describes the image for screen readers.">
                <TextInput
                  id="p-alt"
                  value={project.cover_alt}
                  onChange={(v) => patch('cover_alt', v)}
                />
              </Field>

              <Field label="Video URL" id="p-video" hint="Optional. Plays instead of the cover.">
                <div className="flex gap-2">
                  <TextInput
                    id="p-video"
                    value={project.video_url ?? ''}
                    onChange={(v) => patch('video_url', v || null)}
                    placeholder="https://…/clip.mp4"
                  />
                  <Button variant="ghost" onClick={() => setPicker('video')}>
                    Pick
                  </Button>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Metadata">
            <div className="space-y-4">
              <Field label="Category" id="p-category">
                <TextInput
                  id="p-category"
                  value={project.category}
                  onChange={(v) => patch('category', v)}
                />
              </Field>
              <Field label="Year" id="p-year">
                <TextInput id="p-year" value={project.year} onChange={(v) => patch('year', v)} />
              </Field>
              <Field label="Technologies" id="p-tech" hint="Comma separated.">
                <TextInput
                  id="p-tech"
                  value={techInput}
                  onChange={setTechInput}
                  placeholder="Python, PyTorch, RAG"
                />
              </Field>
              <Field label="Project URL" id="p-url">
                <TextInput
                  id="p-url"
                  value={project.project_url ?? ''}
                  onChange={(v) => patch('project_url', v || null)}
                  placeholder="https://"
                />
              </Field>
              <Field label="GitHub URL" id="p-github">
                <TextInput
                  id="p-github"
                  value={project.github_url ?? ''}
                  onChange={(v) => patch('github_url', v || null)}
                  placeholder="https://github.com/"
                />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sticky save */}
      <div className="sticky bottom-4 z-30">
        <div
          className="liquid-glass liquid-glass-strong rounded-2xl px-5 py-4"
          style={{ backgroundColor: 'rgba(13,13,13,0.85)' }}
        >
          <SaveBar state={state} error={error} onSave={() => void save()} />
        </div>
      </div>

      <MediaPicker
        open={picker !== null}
        title={
          picker === 'cover'
            ? 'Select a cover image'
            : picker === 'video'
              ? 'Select a video'
              : 'Add gallery images'
        }
        selectedUrls={
          picker === 'gallery'
            ? gallery.map((g) => g.url)
            : picker === 'cover' && project.cover_image
              ? [project.cover_image]
              : []
        }
        onClose={() => setPicker(null)}
        onSelect={onPick}
      />
    </div>
  );
}
