import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';
import { urlsetXml } from './sitemap-core.xml';

const BUILD_DATE = new Date().toISOString().slice(0, 10);

export async function getStaticPaths() {
  const entries = await getCollection('locations');
  const states = new Set(
    entries.filter((e) => e.data.tier !== 'hub').map((e) => e.id.split('/')[0]),
  );
  return [...states].map((state) => ({ params: { state } }));
}

export const GET: APIRoute = async ({ params }) => {
  const entries = await getCollection('locations');
  const urls = entries
    .filter((e) => e.data.tier !== 'hub' && e.id.split('/')[0] === params.state)
    .map((e) => ({ path: `/locations/${e.id}/`, lastmod: BUILD_DATE }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return new Response(urlsetXml(urls, SITE.domain), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
