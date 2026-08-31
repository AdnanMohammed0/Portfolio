import { Container, EmptyState, SectionHeading, SectionLabel } from '@/components/primitives';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useReveal } from '@/hooks/useReveal';

function TimelineRow({ entry, index }: { entry: import('@/types').Experience; index: number }) {
  const ref = useReveal<HTMLLIElement>({ delay: index * 90 });

  return (
    <li ref={ref} className="reveal group relative pl-8 sm:pl-12">
      {/* Rail node */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-2 h-2 w-2 rounded-full bg-white/25 ring-4 ring-black transition-all duration-500 group-hover:bg-white group-hover:shadow-[0_0_14px_rgba(255,255,255,0.5)]"
      />

      <div className="grid gap-2 border-b border-white/[0.07] pb-10 sm:grid-cols-12 sm:gap-6">
        <p className="label-xs sm:col-span-3 sm:pt-1">{entry.date_range}</p>

        <div className="sm:col-span-9">
          <h3 className="text-xl tracking-tight text-white sm:text-2xl">{entry.position}</h3>
          <p className="mt-1 text-sm text-white/45">{entry.organization}</p>
          {entry.description && (
            <p className="prose-body mt-4 max-w-2xl text-[15px]">{entry.description}</p>
          )}
        </div>
      </div>
    </li>
  );
}

export function ExperienceSection() {
  const { data } = usePortfolio();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section id="experience" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-40">
      <Container>
        <div ref={ref} className="reveal max-w-2xl">
          <SectionLabel index="04">Background</SectionLabel>
          <SectionHeading className="mt-6">Where I have been.</SectionHeading>
        </div>

        <div className="mt-14">
          {data.experience.length === 0 ? (
            <EmptyState
              title="Add your first experience entry."
              hint="Timeline entries are managed from the dashboard."
            />
          ) : (
            <ol className="relative space-y-10">
              {/* Rail */}
              <span
                aria-hidden="true"
                className="absolute left-[3px] top-2 h-full w-px bg-gradient-to-b from-white/20 via-white/8 to-transparent"
              />
              {data.experience.map((entry, index) => (
                <TimelineRow key={entry.id} entry={entry} index={index} />
              ))}
            </ol>
          )}
        </div>
      </Container>
    </section>
  );
}
