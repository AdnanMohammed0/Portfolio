/**
 * Writes dist/sitemap.xml after the bundle is built.
 *
 * Project pages come from the database rather than a hard-coded list, so the
 * sitemap has to be generated rather than written by hand — otherwise it goes
 * stale the moment a project is added or unpublished in the dashboard. This
 * runs on every build, so a redeploy is all it takes to refresh it.
 *
 * Requires SITE_URL (or VITE_SITE_URL) — the canonical origin, e.g.
 * https://adnanmohammed.com. Without it the script writes a sitemap containing
 * only the home page and says so, rather than emitting wrong URLs: a sitemap
 * full of the wrong origin is worse for search than none at all.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'dist');

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

/** Static routes. `/admin` is deliberately absent — it is noindex. */
const STATIC_ROUTES = [{ path: '/', changefreq: 'weekly', priority: '1.0' }];

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Published projects only — drafts must never reach a search engine. */
async function fetchProjects() {
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/projects?select=slug,updated_at&published=eq.true`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
    );
    if (!response.ok) {
      console.warn(`[sitemap] Supabase returned ${response.status}; listing static routes only.`);
      return [];
    }
    return await response.json();
  } catch (cause) {
    console.warn('[sitemap] Could not reach Supabase:', cause.message);
    return [];
  }
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  if (!siteUrl) {
    console.warn(
      '\n[sitemap] SITE_URL is not set, so no sitemap was written.\n' +
        '          Set it to your canonical origin (e.g. https://example.com)\n' +
        '          in the host\'s environment variables and redeploy.\n',
    );
    return;
  }

  const projects = await fetchProjects();

  const entries = [
    ...STATIC_ROUTES.map((route) => ({
      loc: `${siteUrl}${route.path}`,
      changefreq: route.changefreq,
      priority: route.priority,
    })),
    ...projects.map((project) => ({
      loc: `${siteUrl}/work/${project.slug}`,
      lastmod: project.updated_at,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(path.join(OUT_DIR, 'sitemap.xml'), xml, 'utf8');

  // robots.txt has to name the sitemap's absolute URL, so it is written here
  // too rather than sitting static in public/.
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    '# The dashboard is private and carries a noindex tag as well.',
    'Disallow: /admin',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  await writeFile(path.join(OUT_DIR, 'robots.txt'), robots, 'utf8');

  console.log(
    `[sitemap] Wrote ${entries.length} URL${entries.length === 1 ? '' : 's'} ` +
      `(${projects.length} project page${projects.length === 1 ? '' : 's'}) for ${siteUrl}`,
  );
}

main().catch((cause) => {
  // A missing sitemap must not fail the deployment.
  console.error('[sitemap] Failed:', cause);
});
