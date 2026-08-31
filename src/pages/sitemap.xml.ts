import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';

/** Build date fallback for routes without content-managed dates. */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/**
 * Hand-maintained list of the fixed (non-collection) routes. The sitemap
 * test cross-checks this against every built page in dist/, so adding a page
 * without listing it here fails loudly.
 */
const STATIC_ROUTES = [
  '/',
  '/about/',
  '/accessibility/',
  '/contact/',
  '/disclaimer/',
  '/experts/',
  '/experts/jason-purinton/',
  '/locations/',
  '/matters/',
  '/privacy/',
  '/refer-a-case/',
  '/refer-a-case/thanks/',
  '/resources/',
  '/services/',
] as const;

export const GET: APIRoute = async () => {
  const urls: { path: string; lastmod: string }[] = STATIC_ROUTES.map((path) => ({
    path,
    lastmod: BUILD_DATE,
  }));

  const templateSections = [
    ['services', await getCollection('services')],
    ['matters', await getCollection('matters')],
    ['resources', await getCollection('resources')],
  ] as const;
  for (const [section, entries] of templateSections) {
    for (const entry of entries) {
      urls.push({ path: `/${section}/${entry.id}/`, lastmod: entry.data.dateModified });
    }
  }
  for (const entry of await getCollection('locations')) {
    urls.push({ path: `/locations/${entry.id}/`, lastmod: BUILD_DATE });
  }

  urls.sort((a, b) => a.path.localeCompare(b.path));

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${SITE.domain}${u.path}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`,
      )
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
