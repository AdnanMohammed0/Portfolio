import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Favicon, Seo } from '@/components/Seo';
import { Hero } from '@/sections/Hero';
import { AboutSection } from '@/sections/AboutSection';
import { WorksSection } from '@/sections/WorksSection';
import { SkillsSection } from '@/sections/SkillsSection';
import { ExperienceSection } from '@/sections/ExperienceSection';
import { ContactSection } from '@/sections/ContactSection';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function HomePage() {
  const { data, error } = usePortfolio();
  const { settings } = data.content;
  const { hash } = useLocation();

  // Deep links like /#works arrive before the sections have laid out.
  useEffect(() => {
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <>
      <Seo
        title={settings.seo_title || settings.site_name}
        description={settings.seo_description}
        image={settings.og_image}
        path="/"
      />
      <Favicon href={settings.favicon} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main">
        <Hero />
        <AboutSection />
        <WorksSection />
        <SkillsSection />
        <ExperienceSection />
        <ContactSection />
      </main>

      <Footer />

      {error && (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-500/10 px-4 py-2 text-xs text-red-200/80 backdrop-blur"
        >
          Showing default content — {error}
        </p>
      )}
    </>
  );
}
