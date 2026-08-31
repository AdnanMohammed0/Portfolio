import { useRef } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/primitives';
import { InteractiveHand } from '@/components/hand/InteractiveHand';
import { useSiteContent } from '@/hooks/usePortfolio';
import { useIsCompact } from '@/hooks/useMediaQuery';

/**
 * The hero. The interactive hand lives inside it — never as its own section.
 *
 * Desktop: copy left, hand right, occupying roughly 45% of the hero.
 * Mobile: the layout is re-composed rather than shrunk — copy, then CTA, then
 * the hand beneath it with the AR toggle, so nothing overlaps the text.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { hero } = useSiteContent();
  const compact = useIsCompact();

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
            </div>
          </div>

          {/* ---- Hand ----
              One canvas for every breakpoint. On mobile it drops below the copy
              and gains the AR toggle; on desktop it takes the right half and
              tracks the pointer. Mounting two canvases would mean two WebGL
              contexts for one visible hand. */}
          <div className="order-2 lg:col-span-6 xl:col-span-6">
            <InteractiveHand
              trackingTargetRef={heroRef}
              showArButton={compact}
              autoStartAr={compact}
              className={
                compact
                  ? 'relative mx-auto block h-[48vh] max-h-[440px] w-full max-w-sm pb-16'
                  : 'block h-[72vh] max-h-[760px] w-full'
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
