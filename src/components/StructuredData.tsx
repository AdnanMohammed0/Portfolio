import { useEffect } from 'react';
import type { Project, SiteContent } from '@/types';

/**
 * JSON-LD structured data.
 *
 * Meta tags describe a page; structured data describes the *thing* the page is
 * about. For a name query this is the difference that matters: a `Person`
 * record with a job title, a canonical URL and verified profile links lets a
 * search engine connect this page to an identity, instead of treating the name
 * as two ordinary words on a page.
 *
 * `sameAs` is the important field. Each entry is a claim that the same person
 * owns that profile, and search engines corroborate it against the link back
 * from those profiles — which is why linking to this site from GitHub and
 * LinkedIn does more for a name search than anything on the page itself.
 */

const SCRIPT_ID = 'structured-data';

function useJsonLd(data: unknown): void {
  useEffect(() => {
    // One tag, replaced per route, rather than accumulating on navigation.
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      script?.remove();
    };
  }, [data]);
}

function origin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/** Person + WebSite, for the home page. */
export function PersonSchema({ content }: { content: SiteContent }) {
  const { settings, contact, about } = content;
  const url = origin();

  // Only real, non-empty profiles — an empty or placeholder URL in `sameAs`
  // weakens the claim rather than strengthening it.
  const sameAs = [contact.github, contact.linkedin, contact.instagram, contact.x]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value) && /^https?:\/\/.+\..+/.test(value ?? ''))
    .filter((value) => !/^https?:\/\/(github|linkedin|instagram)\.com\/?$/i.test(value));

  const person = {
    '@type': 'Person',
    '@id': `${url}/#person`,
    name: settings.site_name,
    url,
    jobTitle: 'AI Engineer & Developer',
    description: about.short_bio,
    ...(about.profile_image ? { image: about.profile_image } : {}),
    ...(contact.email ? { email: `mailto:${contact.email}` } : {}),
    ...(contact.location ? { address: { '@type': 'PostalAddress', addressLocality: contact.location } } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    knowsAbout: [
      'Artificial Intelligence',
      'Machine Learning',
      'Software Development',
      'Computer Vision',
      'Web Development',
    ],
  };

  useJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      person,
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        url,
        name: settings.seo_title || settings.site_name,
        description: settings.seo_description,
        inLanguage: 'en',
        publisher: { '@id': `${url}/#person` },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}/#profilepage`,
        url,
        name: settings.seo_title || settings.site_name,
        about: { '@id': `${url}/#person` },
        isPartOf: { '@id': `${url}/#website` },
      },
    ],
  });

  return null;
}

/** CreativeWork + breadcrumbs, for a project page. */
export function ProjectSchema({
  project,
  content,
}: {
  project: Project;
  content: SiteContent;
}) {
  const url = origin();

  useJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': `${url}/work/${project.slug}#work`,
        name: project.title,
        headline: project.title,
        description: project.short_description,
        url: `${url}/work/${project.slug}`,
        ...(project.cover_image ? { image: project.cover_image } : {}),
        ...(project.year ? { dateCreated: project.year } : {}),
        dateModified: project.updated_at,
        genre: project.category,
        keywords: project.technologies.join(', '),
        author: { '@type': 'Person', name: content.settings.site_name, url },
        creator: { '@type': 'Person', name: content.settings.site_name, url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: url },
          {
            '@type': 'ListItem',
            position: 2,
            name: project.title,
            item: `${url}/work/${project.slug}`,
          },
        ],
      },
    ],
  });

  return null;
}
