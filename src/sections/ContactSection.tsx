import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Github, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import {
  Container,
  LiquidGlass,
  SectionHeading,
  SectionLabel,
  Spinner,
} from '@/components/primitives';
import { useSiteContent } from '@/hooks/usePortfolio';
import { useReveal } from '@/hooks/useReveal';
import { content } from '@/services/content';
import { track, trackClick } from '@/services/analytics';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function ContactSection() {
  const { contact, settings } = useSiteContent();
  const ref = useReveal<HTMLDivElement>();
  const formRef = useReveal<HTMLDivElement>({ delay: 120 });

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const socials = [
    { href: contact.github, label: 'GitHub', icon: Github },
    { href: contact.linkedin, label: 'LinkedIn', icon: Linkedin },
    { href: contact.instagram, label: 'Instagram', icon: Instagram },
  ].filter((s) => Boolean(s.href));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;

    setStatus('sending');
    setError(null);
    try {
      await content.submitMessage(form);
      void track('contact_submit');
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } catch (cause) {
      setStatus('error');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please email me directly instead.',
      );
    }
  }

  return (
    <section id="contact" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-40">
      <Container>
        <div ref={ref} className="reveal max-w-3xl">
          <SectionLabel index="05">Contact</SectionLabel>
          <SectionHeading className="mt-6">{contact.heading}</SectionHeading>
          {contact.intro && <p className="prose-body mt-6 max-w-xl text-pretty">{contact.intro}</p>}
          <p className="mt-8 flex items-center gap-3 text-sm tracking-[0.16em] text-white/40">
            <span aria-hidden="true" className="h-px w-8 bg-white/15" />
            {settings.site_name}
          </p>
        </div>

        <div ref={formRef} className="reveal mt-14 grid gap-4 lg:grid-cols-12">
          {/* ---- Form ---- */}
          <LiquidGlass
            noise
            className="glow-blue relative overflow-hidden p-6 sm:p-8 lg:col-span-7"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <form onSubmit={onSubmit} className="relative space-y-4" noValidate={false}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="label-xs mb-2 block">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="field"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="label-xs mb-2 block">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="field"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="label-xs mb-2 block">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="field resize-none"
                  placeholder="Tell me what you are building."
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {status === 'sending' ? 'Sending' : status === 'sent' ? 'Sent' : 'Send Message'}
                  {status === 'sent' ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <ArrowUpRight size={16} aria-hidden="true" />
                  )}
                </button>

                {status === 'sending' && <Spinner label="Sending your message" />}

                <p aria-live="polite" className="text-sm">
                  {status === 'sent' && (
                    <span className="text-emerald-300/80">Thanks — I will get back to you.</span>
                  )}
                  {status === 'error' && <span className="text-red-300/80">{error}</span>}
                </p>
              </div>
            </form>
          </LiquidGlass>

          {/* ---- Details ---- */}
          <div className="grid gap-4 lg:col-span-5">
            <LiquidGlass className="p-6 sm:p-8" style={{ backgroundColor: 'var(--surface)' }}>
              <p className="label-xs">Direct</p>
              <ul className="mt-5 space-y-4 text-sm">
                {contact.email && (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      className="group flex items-center gap-3 text-white/75 transition-colors hover:text-white"
                    >
                      <Mail size={15} className="text-white/30" aria-hidden="true" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  </li>
                )}
                {contact.phone && (
                  <li>
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-3 text-white/75 transition-colors hover:text-white"
                    >
                      <Phone size={15} className="text-white/30" aria-hidden="true" />
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact.location && (
                  <li className="flex items-center gap-3 text-white/55">
                    <MapPin size={15} className="text-white/30" aria-hidden="true" />
                    {contact.location}
                  </li>
                )}
              </ul>
            </LiquidGlass>

            {socials.length > 0 && (
              <LiquidGlass
                noise
                className="flex-1 p-6 sm:p-8"
                style={{ backgroundColor: 'var(--surface-2)' }}
              >
                <p className="label-xs">Elsewhere</p>
                <ul className="mt-5 space-y-3">
                  {socials.map(({ href, label, icon: Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackClick('social_click', label)}
                        className="group flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-sm text-white/75 transition-colors hover:text-white"
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={15} className="text-white/40" aria-hidden="true" />
                          {label}
                        </span>
                        <ArrowUpRight
                          size={14}
                          aria-hidden="true"
                          className="opacity-0 transition-opacity group-hover:opacity-60"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </LiquidGlass>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
