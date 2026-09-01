import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';

/** Build date fallback for routes without content-managed dates. */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/**
 * Hand-maintained list of the fixed (non-collection) routes. The sitemap
 * test cross-checks this against every built page in dist/, so adding a page
 * without listing it here fails loudly.
 *
 * Deliberately absent: /refer-a-case/thanks/ (noindexed form-success state;
 * search visitors must never land on "your request has been received" without
 * having submitted anything). The seo-artifacts suite pins the exclusion and
 * asserts the page carries the matching robots noindex.
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
  '/locations/nationwide/',
  '/matters/',
  '/privacy/',
  '/refer-a-case/',
  '/resources/',
  '/services/',
] as const;

/** Renders a urlset XML document for a list of urls. Shared with the per-state sitemaps. */
export function urlsetXml(urls: { path: string; lastmod: string }[], domain: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${domain}${u.path}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`,
      )
      .join('\n') +
    '\n</urlset>\n'
  );
}

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

  urls.sort((a, b) => a.path.localeCompare(b.path));

  return new Response(urlsetXml(urls, SITE.domain), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
