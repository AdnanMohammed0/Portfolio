import { useEffect } from 'react';

interface Props {
  title: string;
  description: string;
  image?: string | null;
  /** Absolute or root-relative path for the canonical link. */
  path?: string;
  type?: 'website' | 'article';
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

/**
 * Drives the document head from database-backed content, so SEO values are
 * editable from the dashboard rather than baked into the bundle.
 */
export function Seo({ title, description, image, path, type = 'website' }: Props) {
  useEffect(() => {
    document.title = title;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta(
      'meta[name="twitter:card"]',
      'name',
      'twitter:card',
      image ? 'summary_large_image' : 'summary',
    );

    if (image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    }

    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertLink('canonical', url);
  }, [title, description, image, path, type]);

  return null;
}

/** Applies a favicon chosen in the dashboard. */
export function Favicon({ href }: { href: string | null }) {
  useEffect(() => {
    if (!href) return;
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const previous = link.href;
    link.href = href;
    return () => {
      link.href = previous;
    };
  }, [href]);
  return null;
}
