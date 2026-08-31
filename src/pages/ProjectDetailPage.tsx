import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Github } from 'lucide-react';
import type { Project } from '@/types';
import { Container, LiquidGlass, Skeleton } from '@/components/primitives';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Seo } from '@/components/Seo';
import { content } from '@/services/content';
import { usePortfolio } from '@/hooks/usePortfolio';
import { isVideo } from '@/lib/utils';

export default function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const { data } = usePortfolio();

  // Serve instantly from the already-loaded list, then confirm from the source.
  const preloaded = useMemo(
    () => data.projects.find((p) => p.slug === slug) ?? null,
    [data.projects, slug],
  );

  const [project, setProject] = useState<Project | null>(preloaded);
  const [loading, setLoading] = useState(!preloaded);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let active = true;
    content
      .getProjectBySlug(slug)
      .then((found) => {
        if (!active) return;
        if (found) setProject(found);
        else if (!preloaded) setMissing(true);
      })
      .catch(() => active && !preloaded && setMissing(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug, preloaded]);

  const others = data.projects.filter((p) => p.slug !== slug).slice(0, 3);

  if (missing) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center">
          <Container className="text-center">
            <p className="label-xs">404</p>
            <h1 className="mt-4 text-4xl tracking-tightest">Project not found.</h1>
            <Link to="/#works" className="btn btn-primary mt-8">
              Back to works
            </Link>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  const hero = project?.video_url ?? project?.cover_image ?? null;

  return (
    <>
      {project && (
        <Seo
          type="article"
          title={`${project.title} — Work`}
          description={project.short_description}
          image={project.cover_image}
          path={`/work/${project.slug}`}
        />
      )}

      <Navbar />

      <main id="main" className="pt-28 sm:pt-32">
        <Container>
          <Link
            to="/#works"
            className="inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            All works
          </Link>

          {loading && !project ? (
            <div className="mt-10 space-y-6">
              <Skeleton className="h-14 w-2/3" />
              <Skeleton className="aspect-[16/9] w-full" />
            </div>
          ) : (
            project && (
              <>
                {/* ---- Title block ---- */}
                <header className="mt-10 grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <p className="label-xs">
                      {project.category}
                      {project.year && ` — ${project.year}`}
                    </p>
                    <h1 className="mt-5 text-balance text-[clamp(2.2rem,6vw,4.6rem)] leading-[1.02] tracking-tightest">
                      {project.title}
                    </h1>
                  </div>
                  <div className="lg:col-span-4 lg:pt-14">
                    <p className="prose-body text-pretty">{project.short_description}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {project.project_url && (
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                        >
                          Visit project
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                      )}
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost liquid-glass"
                        >
                          <Github size={15} aria-hidden="true" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </header>

                {/* ---- Hero media ---- */}
                <LiquidGlass
                  noise
                  className="mt-12 aspect-[16/9] w-full overflow-hidden"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  {hero && isVideo(hero) ? (
                    <video
                      src={hero}
                      poster={project.cover_image ?? undefined}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : hero ? (
                    <img
                      src={hero}
                      alt={project.cover_alt || project.title}
                      className="h-full w-full object-cover"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ backgroundColor: 'var(--surface-2)' }}
                    >
                      <span className="label-xs">No cover image</span>
                    </div>
                  )}
                </LiquidGlass>

                {/* ---- Body ---- */}
                <div className="mt-16 grid gap-10 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <dl className="space-y-8">
                      {project.technologies.length > 0 && (
                        <div>
                          <dt className="label-xs">Technologies</dt>
                          <dd className="mt-4 flex flex-wrap gap-2">
                            {project.technologies.map((tech) => (
                              <span
                                key={tech}
                                className="liquid-glass rounded-full px-3.5 py-2 text-[12px] text-white/70"
                              >
                                {tech}
                              </span>
                            ))}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="label-xs">Year</dt>
                        <dd className="mt-3 text-lg tabular-nums text-white/80">{project.year}</dd>
                      </div>
                      <div>
                        <dt className="label-xs">Category</dt>
                        <dd className="mt-3 text-lg text-white/80">{project.category}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="lg:col-span-8">
                    {project.full_description.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="prose-body mb-5 max-w-2xl text-pretty">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* ---- Gallery ---- */}
                {project.images && project.images.length > 0 && (
                  <div className="mt-16 grid gap-4 sm:grid-cols-2">
                    {project.images.map((image, i) => (
                      <LiquidGlass
                        key={image.id}
                        className={
                          'aspect-[4/3] overflow-hidden ' + (i % 3 === 0 ? 'sm:col-span-2' : '')
                        }
                        style={{ backgroundColor: 'var(--surface)' }}
                      >
                        <img
                          src={image.url}
                          alt={image.alt || `${project.title} — image ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // One broken image must not take down the gallery.
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </LiquidGlass>
                    ))}
                  </div>
                )}

                {/* ---- Next projects ---- */}
                {others.length > 0 && (
                  <div className="mt-24 border-t border-white/[0.07] pt-12">
                    <p className="label-xs">More work</p>
                    <ul className="mt-6 divide-y divide-white/[0.07]">
                      {others.map((other) => (
                        <li key={other.id}>
                          <Link
                            to={`/work/${other.slug}`}
                            className="group flex items-center justify-between gap-6 py-6"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xl tracking-tight text-white/75 transition-colors group-hover:text-white sm:text-2xl">
                                {other.title}
                              </span>
                              <span className="label-xs mt-1 block">{other.category}</span>
                            </span>
                            <ArrowUpRight
                              size={20}
                              aria-hidden="true"
                              className="shrink-0 text-white/25 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-white"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          )}
        </Container>
      </main>

      <Footer />
    </>
  );
}
