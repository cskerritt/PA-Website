import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';

export const GET: APIRoute = async () => {
  const entries = await getCollection('locations');
  const states = [
    ...new Set(entries.filter((e) => e.data.tier !== 'hub').map((e) => e.id.split('/')[0])),
  ].sort();
  const children = ['/sitemap-core.xml', ...states.map((s) => `/sitemap-loc-${s}.xml`)];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    children
      .map((c) => `  <sitemap>\n    <loc>${SITE.domain}${c}</loc>\n  </sitemap>`)
      .join('\n') +
    '\n</sitemapindex>\n';
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
