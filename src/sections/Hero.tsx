import { useRef } from 'react';
import { ArrowDown, ArrowUpRight, Github, Instagram, Linkedin, Mail } from 'lucide-react';
import { Container } from '@/components/primitives';
import { InteractiveHand } from '@/components/hand/InteractiveHand';
import { useSiteContent } from '@/hooks/usePortfolio';
import { useIsCompact, useIsTouchDevice } from '@/hooks/useMediaQuery';

/**
 * The hero. The interactive hand lives inside it — never as its own section.
 *
 * Desktop: copy left, hand right, occupying roughly 45% of the hero.
 * Mobile: the layout is re-composed rather than shrunk — copy, then CTA, then
 * the hand beneath it, so nothing overlaps the text.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { hero, contact } = useSiteContent();
  const compact = useIsCompact();
  // Tilt control is for touch hardware, which is not the same thing as a narrow window.
  const touch = useIsTouchDevice();

  // Driven by the dashboard's contact fields; a blank field simply drops out.
  // A mailto: hands off to the mail client, so it must not open a blank tab.
  const socials = [
    { href: contact.github, label: 'GitHub', icon: Github, external: true },
    { href: contact.linkedin, label: 'LinkedIn', icon: Linkedin, external: true },
    { href: contact.instagram, label: 'Instagram', icon: Instagram, external: true },
    {
      href: contact.email ? `mailto:${contact.email}` : '',
      label: 'Email',
      icon: Mail,
      external: false,
    },
  ].filter((item) => Boolean(item.href));

  const jump = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24 lg:pt-0"
    >
      {/* Horizon glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45vh] opacity-60"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 100%, rgba(50,68,68,0.35), transparent 70%)',
        }}
      />

      <Container className="relative">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
          {/* ---- Copy ---- */}
          <div className="order-1 lg:col-span-6 xl:col-span-6">
            <p className="label-xs animate-fade">{hero.label}</p>

            <h1 className="mt-6 text-balance text-[clamp(2.6rem,7.4vw,5.4rem)] font-medium leading-[0.98] tracking-tightest">
              {hero.heading}
            </h1>

            <p className="prose-body mt-6 max-w-lg text-pretty">{hero.description}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => jump(hero.primary_cta_url)}
                className="btn btn-primary"
              >
                {hero.primary_cta_text}
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => jump(hero.secondary_cta_url)}
                className="btn btn-ghost liquid-glass"
              >
                {hero.secondary_cta_text}
              </button>

              {/* Social links sit with the CTAs rather than only in the footer,
                  so the first screen offers somewhere to go. Each one is hidden
                  when its field is blank in the dashboard. */}
              {socials.length > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="mx-1 hidden h-6 w-px bg-white/12 sm:block"
                  />
                  <ul className="flex items-center gap-2">
                    {socials.map(({ href, label, icon: Icon, external }) => (
                      <li key={label}>
                        <a
                          href={href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noopener noreferrer' : undefined}
                          aria-label={label}
                          title={label}
                          className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                        >
                          <Icon size={16} aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* ---- Hand ----
              One canvas for every breakpoint. On desktop it takes the right
              half and follows the pointer; on touch devices it drops below the
              copy and follows how the phone is tilted. Mounting two canvases
              would mean two WebGL contexts for one visible hand. */}
          <div className="order-2 lg:col-span-6 xl:col-span-6">
            <InteractiveHand
              trackingTargetRef={heroRef}
              useTilt={touch}
              className={
                compact
                  ? 'relative mx-auto block h-[56vh] max-h-[520px] w-full max-w-sm pb-16'
                  : 'block h-[84vh] max-h-[880px] w-full'
              }
            />
          </div>
        </div>
      </Container>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/25">
          <ArrowDown size={13} className="animate-drift" aria-hidden="true" />
          Scroll
        </span>
      </div>
    </section>
  );
}
