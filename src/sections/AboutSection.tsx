import { Container, LiquidGlass, SectionHeading, SectionLabel } from '@/components/primitives';
import { useReveal } from '@/hooks/useReveal';
import { usePortfolio, useSiteContent } from '@/hooks/usePortfolio';

/**
 * Asymmetric editorial layout: oversized label on the left, biography in the
 * centre, portrait on the right. Deliberately not a profile card.
 */
export function AboutSection() {
  const { about } = useSiteContent();
  const { data } = usePortfolio();
  const ref = useReveal<HTMLDivElement>();
  const mediaRef = useReveal<HTMLDivElement>({ delay: 140 });

  const stats = [
    { value: String(data.projects.length).padStart(2, '0'), label: 'Selected works' },
    { value: String(data.skills.length).padStart(2, '0'), label: 'Technologies' },
    { value: String(data.experience.length).padStart(2, '0'), label: 'Chapters' },
  ];

  return (
    <section id="about" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-40">
      <Container>
        <div ref={ref} className="reveal grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Label column */}
          <div className="lg:col-span-3">
            <SectionLabel index="01">About</SectionLabel>
            <SectionHeading className="mt-6 lg:text-[clamp(2rem,3.2vw,3rem)]">
              {about.heading}
            </SectionHeading>
            <p className="mt-4 text-sm tracking-[0.16em] text-white/35">
              {data.content.settings.site_name}
            </p>
          </div>

          {/* Biography column */}
          <div className="lg:col-span-5 lg:pt-16">
            <p className="text-balance text-xl leading-snug text-white sm:text-2xl">
              {about.short_bio}
            </p>
            <p className="prose-body mt-6 text-pretty">{about.long_bio}</p>

            {about.secondary_info && (
              <p className="mt-8 flex items-center gap-2.5 text-sm text-white/45">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                />
                {about.secondary_info}
              </p>
            )}

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="label-xs">{stat.label}</dt>
                  <dd className="mt-2 text-2xl tabular-nums tracking-tight text-white sm:text-3xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Portrait column */}
          <div ref={mediaRef} className="reveal lg:col-span-4">
            <LiquidGlass
              noise
              className="glow-teal relative aspect-[4/5] w-full overflow-hidden rounded-2xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              {about.profile_image ? (
                <img
                  src={about.profile_image}
                  alt={about.heading}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: 'var(--surface-2)' }}
                >
                  <span className="label-xs">Portrait</span>
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
              />
            </LiquidGlass>
          </div>
        </div>
      </Container>
    </section>
  );
}
