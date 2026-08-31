import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Container } from '@/components/primitives';
import { useSiteContent } from '@/hooks/usePortfolio';
import { cx } from '@/lib/utils';

const LINKS = [
  { label: 'Home', hash: '#home' },
  { label: 'About', hash: '#about' },
  { label: 'Works', hash: '#works' },
  { label: 'Skills', hash: '#skills' },
  { label: 'Experience', hash: '#experience' },
  { label: 'Contact', hash: '#contact' },
];

export function Navbar() {
  const { settings } = useSiteContent();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('#home');
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently in view.
  useEffect(() => {
    if (!onHome || typeof IntersectionObserver === 'undefined') return;
    const sections = LINKS.map((l) => document.querySelector(l.hash)).filter(
      (el): el is Element => Boolean(el),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { threshold: [0.2, 0.5], rootMargin: '-20% 0px -50% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [onHome]);

  // Lock scroll behind the mobile sheet.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);

  const go = (hash: string) => {
    setOpen(false);
    if (onHome) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/${hash}`);
    }
  };

  return (
    <>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled ? 'py-2' : 'py-4',
        )}
      >
        <Container>
          <nav
            aria-label="Primary"
            className={cx(
              'flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-5',
              scrolled ? 'liquid-glass liquid-glass-strong' : 'bg-transparent',
            )}
          >
            <Link
              to="/"
              onClick={() => onHome && go('#home')}
              className="text-sm tracking-[0.14em] text-white transition-opacity hover:opacity-70"
            >
              {settings.logo_text || settings.site_name}
            </Link>

            <ul className="hidden items-center gap-1 lg:flex">
              {LINKS.map((link) => (
                <li key={link.hash}>
                  <button
                    type="button"
                    onClick={() => go(link.hash)}
                    aria-current={onHome && active === link.hash ? 'true' : undefined}
                    className={cx(
                      'rounded-full px-3.5 py-2 text-[13px] transition-colors duration-300',
                      onHome && active === link.hash
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/85',
                    )}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go('#contact')}
                className="liquid-glass hidden rounded-full px-5 py-2.5 text-[13px] text-white/90 transition-colors duration-300 hover:text-white sm:inline-flex"
              >
                Let&apos;s Talk
              </button>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-white/80 lg:hidden"
              >
                {open ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
              </button>
            </div>
          </nav>
        </Container>
      </header>

      {/* Mobile sheet */}
      <div
        id="mobile-nav"
        hidden={!open}
        className={cx(
          'fixed inset-0 z-40 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cx(
            'absolute inset-0 bg-black/90 backdrop-blur-xl transition-opacity duration-500',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setOpen(false)}
        />
        <nav
          aria-label="Mobile"
          className="relative flex h-full flex-col justify-center gap-1 px-6 pb-20 pt-24"
        >
          {LINKS.map((link, i) => (
            <button
              key={link.hash}
              type="button"
              onClick={() => go(link.hash)}
              style={{ transitionDelay: open ? `${80 + i * 45}ms` : '0ms' }}
              className={cx(
                'flex w-full items-baseline gap-4 border-b border-white/[0.07] py-5 text-left',
                'text-3xl tracking-tightest text-white/80 transition-all duration-700 hover:text-white',
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              )}
            >
              <span className="text-[11px] tabular-nums text-white/25">
                0{i + 1}
              </span>
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go('#contact')}
            className="btn btn-primary mt-8 w-full py-4"
          >
            Let&apos;s Talk
          </button>
        </nav>
      </div>
    </>
  );
}
