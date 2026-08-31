import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '@/types';
import { cx, isVideo } from '@/lib/utils';

/**
 * Bento tile for one project.
 *
 * `tall` cards run the full height of a two-row block, `wide` cards span two
 * columns, `standard` fills a single cell — the mix is what keeps the grid from
 * reading as a uniform gallery.
 */
export type TileSize = 'tall' | 'wide' | 'standard';

interface Props {
  project: Project;
  size: TileSize;
  index: number;
}

const SPAN: Record<TileSize, string> = {
  tall: 'sm:row-span-2 min-h-[22rem] sm:min-h-[30rem]',
  wide: 'sm:col-span-2 min-h-[15rem]',
  standard: 'min-h-[15rem]',
};

/** Small ornamental caption used on every tile, as in the reference layout. */
export function TileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.26em] text-white/45">
      <span aria-hidden="true" className="text-white/25">
        ✧
      </span>
      {children}
      <span aria-hidden="true" className="text-white/25">
        ✧
      </span>
    </p>
  );
}

/** Pauses an offscreen background video instead of decoding it forever. */
function useAutoPauseVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void node.play().catch(() => undefined);
        else node.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}

export function ProjectCard({ project, size, index }: Props) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const videoRef = useAutoPauseVideo();

  const showVideo = Boolean(project.video_url && isVideo(project.video_url)) && !mediaFailed;
  const showImage = !showVideo && Boolean(project.cover_image) && !mediaFailed;
  const hasMedia = showVideo || showImage;

  return (
    <article className={cx('group relative', SPAN[size])}>
      <Link
        to={`/work/${project.slug}`}
        aria-label={`${project.title} — view project`}
        className="block h-full focus-visible:outline-none"
      >
        <div
          className={cx(
            'liquid-glass noise-overlay relative flex h-full flex-col overflow-hidden rounded-2xl',
            'transition-transform duration-700 ease-out group-hover:-translate-y-1',
          )}
          style={{ backgroundColor: hasMedia ? 'var(--surface)' : 'var(--surface-2)' }}
        >
          {/* Media fills the tile */}
          {showVideo && (
            <video
              ref={videoRef}
              src={project.video_url!}
              poster={project.cover_image ?? undefined}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              onError={() => setMediaFailed(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
            />
          )}
          {showImage && (
            <img
              src={project.cover_image!}
              alt={project.cover_alt || project.title}
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
              onError={() => setMediaFailed(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
            />
          )}

          {/* Without media the tile becomes a soft teal field rather than a hole */}
          {!hasMedia && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.06), transparent 60%), linear-gradient(160deg, var(--surface-2), #0b1212 75%)',
              }}
            />
          )}

          {/* Legibility scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/45"
          />

          {/* Top caption */}
          <div className="relative px-5 pt-5">
            <TileLabel>{project.featured ? 'Featured' : project.category || 'Work'}</TileLabel>
          </div>

          {/* Bottom content */}
          <div className="relative mt-auto flex items-end justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <h3
                className={cx(
                  'truncate tracking-tight text-white/90 transition-colors duration-500 group-hover:text-white',
                  size === 'tall' ? 'text-2xl sm:text-[1.75rem]' : 'text-xl',
                )}
              >
                {project.title}
              </h3>

              <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/35">
                {project.year}
                {project.category && ` — ${project.category}`}
              </p>

              {size !== 'standard' && (
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
                  {project.short_description}
                </p>
              )}

              {size === 'tall' && project.technologies.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.technologies.slice(0, 4).map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/45"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <span className="liquid-glass flex h-10 w-10 shrink-0 translate-y-1 items-center justify-center rounded-full text-white/75 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
