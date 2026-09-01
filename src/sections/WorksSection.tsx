import { useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import {
  Container,
  EmptyState,
  SectionHeading,
  SectionLabel,
  Skeleton,
} from '@/components/primitives';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useReveal } from '@/hooks/useReveal';
import { cx } from '@/lib/utils';
import { ProjectCard, type TileSize } from './ProjectCard';

const ALL = 'All';

/**
 * Bento mosaic. The first project takes the tall left tile; the rest cycle
 * through wide and single tiles so the grid stays irregular however many
 * projects exist. Every position is derived, so adding or removing a project in
 * the dashboard never leaves a hole.
 */
function layoutFor(index: number): TileSize {
  if (index === 0) return 'tall';
  const cycle = (index - 1) % 5;
  if (cycle === 0 || cycle === 3) return 'wide';
  if (cycle === 2) return 'tall';
  return 'standard';
}

export function WorksSection() {
  const { data, loading } = usePortfolio();
  const ref = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState(ALL);

  const categories = useMemo(() => {
    const set = new Set(data.projects.map((p) => p.category).filter(Boolean));
    return [ALL, ...Array.from(set)];
  }, [data.projects]);

  const projects = useMemo(() => {
    const list = filter === ALL ? data.projects : data.projects.filter((p) => p.category === filter);
    // Featured first, then by explicit sort order.
    return [...list].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }, [data.projects, filter]);

  return (
    <section id="works" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-40">
      <Container>
        <div ref={ref} className="reveal">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel index="02">Selected Works</SectionLabel>
              <SectionHeading className="mt-6">
                Things I have
                <br />
                designed and built.
              </SectionHeading>
            </div>

            {categories.length > 2 && (
              <div
                role="tablist"
                aria-label="Filter projects by category"
                className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    role="tab"
                    type="button"
                    aria-selected={filter === category}
                    onClick={() => setFilter(category)}
                    className={cx(
                      'shrink-0 rounded-full px-4 py-2 text-[12px] transition-colors duration-300',
                      filter === category
                        ? 'liquid-glass text-white'
                        : 'text-white/40 hover:text-white/75',
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 sm:mt-16">
          {loading ? (
            <div className="grid gap-3 sm:auto-rows-[15rem] sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="min-h-[20rem] sm:row-span-2 sm:min-h-0" />
              <Skeleton className="min-h-[16rem] sm:col-span-2 sm:min-h-0" />
              <Skeleton className="min-h-[16rem] sm:min-h-0" />
              <Skeleton className="min-h-[16rem] sm:min-h-0" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={28} strokeWidth={1.2} />}
              title="No projects yet."
              hint={
                filter === ALL
                  ? 'Projects added from the dashboard appear here automatically.'
                  : `Nothing published under “${filter}” yet.`
              }
            />
          ) : (
            <div className="grid gap-3 sm:auto-rows-[15rem] sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  size={layoutFor(index)}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
