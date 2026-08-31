import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { SITE } from '../src/config/site';
import { distFile } from './helpers';

const DIST = join(process.cwd(), 'dist');

const SEARCH_CRAWLERS = [
  'OAI-SearchBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Googlebot',
  'Bingbot',
];

const SERVICE_SLUGS = [
  'vocational-expert-witness',
  'life-care-planning',
  'medical-cost-projection',
  'forensic-economic-damages',
  'rebuttal-peer-review',
  'expert-testimony-litigation-consulting',
  'coordinated-damages-assessment',
];

/** Every built page route ('' = home), from dist/, excluding the 404 error page. */
function builtRoutes(): string[] {
  return (readdirSync(DIST, { recursive: true }) as string[])
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('index.html'))
    .map((p) => `/${p.replace(/index\.html$/, '')}`)
    .sort();
}

function sitemapLocs(): string[] {
  const xml = distFile('sitemap.xml');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe('robots.txt', () => {
  it('allows every search and answer-engine crawler', () => {
    const robots = distFile('robots.txt');
    for (const agent of SEARCH_CRAWLERS) {
      expect(robots, agent).toContain(`User-agent: ${agent}\nAllow: /`);
    }
  });

  it('disallows the training crawlers while both flags are false', () => {
    expect(SITE.robots.allowGPTBot).toBe(false);
    expect(SITE.robots.allowClaudeBot).toBe(false);
    const robots = distFile('robots.txt');
    expect(robots).toContain('User-agent: GPTBot\nDisallow: /');
    expect(robots).toContain('User-agent: ClaudeBot\nDisallow: /');
  });

  it('leaves all other crawlers explicitly allowed', () => {
    expect(distFile('robots.txt')).toContain('User-agent: *\nAllow: /');
  });

  it('points at the canonical sitemap', () => {
    expect(distFile('robots.txt')).toContain(`Sitemap: ${SITE.domain}/sitemap.xml`);
  });
});

describe('sitemap.xml', () => {
  it('is well-formed XML with a urlset declaration', () => {
    const xml = distFile('sitemap.xml');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
  });

  it('lists at least 38 unique URLs', () => {
    const locs = sitemapLocs();
    expect(locs.length).toBeGreaterThanOrEqual(38);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it('every loc is on the canonical domain, slash-terminated, and resolves to a built page', () => {
    for (const loc of sitemapLocs()) {
      expect(loc.startsWith(`${SITE.domain}/`), loc).toBe(true);
      expect(loc.endsWith('/'), loc).toBe(true);
      const path = loc.slice(SITE.domain.length).replace(/^\//, '').replace(/\/$/, '');
      // distFile throws if the page was not built.
      expect(distFile(path).length, loc).toBeGreaterThan(0);
    }
  });

  it('covers every built route so a forgotten page fails loudly (404 excluded)', () => {
    const locs = new Set(sitemapLocs());
    for (const route of builtRoutes()) {
      expect(locs.has(`${SITE.domain}${route}`), `missing from sitemap: ${route}`).toBe(true);
    }
    expect(locs.has(`${SITE.domain}/404.html`)).toBe(false);
    expect(locs.has(`${SITE.domain}/404/`)).toBe(false);
  });

  it('gives every url a YYYY-MM-DD lastmod', () => {
    const xml = distFile('sitemap.xml');
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods.length).toBe(sitemapLocs().length);
    for (const lastmod of lastmods) {
      expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('llms.txt', () => {
  it('opens with the firm directory header and description', () => {
    const txt = distFile('llms.txt');
    expect(txt.startsWith(`# ${SITE.brand}`)).toBe(true);
    expect(txt).toContain(SITE.description50);
    expect(txt).toContain(SITE.principal);
  });

  it('lists every service with an absolute canonical URL', () => {
    const txt = distFile('llms.txt');
    for (const slug of SERVICE_SLUGS) {
      expect(txt, slug).toContain(`${SITE.domain}/services/${slug}/`);
    }
  });

  it('links the referral funnel, matters, resources, and policies', () => {
    const txt = distFile('llms.txt');
    expect(txt).toContain(`${SITE.domain}/refer-a-case/`);
    expect(txt).toContain(`${SITE.domain}/contact/`);
    expect(txt).toContain(`${SITE.domain}/matters/personal-injury/`);
    expect(txt).toContain(`${SITE.domain}/resources/faq/`);
    expect(txt).toContain(`${SITE.domain}/privacy/`);
  });

  it('carries the economist-partner boundary and no em dashes', () => {
    const txt = distFile('llms.txt');
    expect(txt).toContain('independent economist partners');
    expect(txt).not.toContain('—');
    expect(txt).not.toContain('Schedule a Consultation');
  });
});

describe('IndexNow key file', () => {
  it('stores a 32-hex key in the entity record', () => {
    expect(SITE.indexNowKey).toMatch(/^[0-9a-f]{32}$/);
  });

  it('serves a key file whose content equals its filename stem', () => {
    const content = distFile(`${SITE.indexNowKey}.txt`).trim();
    expect(content).toBe(SITE.indexNowKey);
  });
});
