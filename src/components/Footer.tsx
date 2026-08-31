import { Link } from 'react-router-dom';
import { Github, Instagram, Linkedin } from 'lucide-react';
import { Container } from '@/components/primitives';
import { useSiteContent } from '@/hooks/usePortfolio';

const LINKS = [
  { label: 'About', hash: '#about' },
  { label: 'Works', hash: '#works' },
  { label: 'Skills', hash: '#skills' },
  { label: 'Experience', hash: '#experience' },
  { label: 'Contact', hash: '#contact' },
];

export function Footer() {
  const { settings, contact } = useSiteContent();

  const socials = [
    { href: contact.github, label: 'GitHub', icon: Github },
    { href: contact.linkedin, label: 'LinkedIn', icon: Linkedin },
    { href: contact.instagram, label: 'Instagram', icon: Instagram },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="relative border-t border-white/[0.07] py-12 sm:py-16">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to="/" className="text-sm tracking-[0.14em] text-white hover:opacity-70">
              {settings.logo_text || settings.site_name}
            </Link>
            {settings.status_text && (
              <p className="mt-3 flex items-center gap-2 text-xs text-white/35">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400/70"
                />
                {settings.status_text}
              </p>
            )}
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
            {LINKS.map((link) => (
              <a
                key={link.hash}
                href={`/${link.hash}`}
                className="text-[13px] text-white/45 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {socials.length > 0 && (
            <ul className="flex gap-2">
              {socials.map(({ href, label, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white"
                  >
                    <Icon size={15} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>{settings.footer_copyright}</p>
          <Link to="/admin" className="transition-colors hover:text-white/60">
            Admin
          </Link>
        </div>
      </Container>
    </footer>
  );
}
