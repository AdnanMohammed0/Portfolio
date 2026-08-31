import { useMemo } from 'react';
import { Container, EmptyState, SectionHeading, SectionLabel } from '@/components/primitives';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useReveal } from '@/hooks/useReveal';

export function SkillsSection() {
  const { data } = usePortfolio();
  const ref = useReveal<HTMLDivElement>();

  /** Grouped by category, preserving the admin's explicit ordering. */
  const groups = useMemo(() => {
    const map = new Map<string, typeof data.skills>();
    for (const skill of data.skills) {
      const key = skill.category || 'Other';
      const list = map.get(key) ?? [];
      list.push(skill);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [data.skills]);

  return (
    <section id="skills" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-40">
      {/* Section tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/4 h-1/2 opacity-40"
        style={{
          background: 'radial-gradient(50% 60% at 20% 50%, rgba(50,68,68,0.4), transparent 70%)',
        }}
      />

      <Container className="relative">
        <div ref={ref} className="reveal grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionLabel index="03">Skills</SectionLabel>
            <SectionHeading className="mt-6 lg:text-[clamp(2rem,3.2vw,3rem)]">
              What I
              <br />
              work with.
            </SectionHeading>
            <p className="prose-body mt-6 max-w-sm text-sm">
              The tools I reach for most — chosen for what they let me ship, not for novelty.
            </p>
          </div>

          <div className="lg:col-span-8">
            {data.skills.length === 0 ? (
              <EmptyState title="No skills listed yet." hint="Add technologies from the dashboard." />
            ) : (
              <div className="space-y-10">
                {groups.map(([category, skills]) => (
                  <div key={category}>
                    <p className="label-xs mb-4">{category}</p>
                    <ul className="flex flex-wrap gap-2.5">
                      {skills.map((skill, i) => (
                        <li key={skill.id}>
                          <span
                            style={{ transitionDelay: `${i * 25}ms` }}
                            className="liquid-glass inline-flex rounded-full px-4 py-2.5 text-[13px] text-white/75 transition-colors duration-500 hover:text-white"
                          >
                            {skill.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
