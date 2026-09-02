import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';
import { states as geoStates, metros as geoMetros, towns as geoTowns } from '../src/lib/geography';

const HUB = 'locations/nationwide';
const INDEX = 'locations';
const METROS = [
  { slug: 'missouri/kansas-city', city: 'Kansas City' },
  { slug: 'missouri/st-louis', city: 'St. Louis' },
  { slug: 'colorado/denver', city: 'Denver' },
  { slug: 'illinois/chicago', city: 'Chicago' },
];
const ALL_LOCATION_PATHS = [INDEX, HUB, ...METROS.map((m) => `locations/${m.slug}`)];

/** Astro escapes entities in rendered text; normalize for comparisons. */
function norm(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function main(path: string): HTMLElement {
  const el = parseDist(path).querySelector('main');
  if (!el) throw new Error(`no <main> in ${path}`);
  el.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
  return el;
}

function mainText(path: string): string {
  return norm(main(path).text);
}

/**
 * Street-address detector from the plan. Applied per text node: `\s+` can
 * cross element boundaries and newlines, so running it against concatenated
 * document text stitches unrelated fragments (the phone number ending one
 * element, a capitalized word such as "Email" starting the next, then a
 * later "St. Louis") into false positives. A real street address is written
 * inside a single text node, where the pattern still catches it.
 */
const STREET_ADDRESS = /\d{2,5}\s+[A-Z][a-z]+.*(St|Ave|Blvd|Suite)/;

function textNodes(el: HTMLElement): string[] {
  const out: string[] = [];
  const visit = (node: { nodeType: number; text?: string; childNodes?: unknown[] }) => {
    if (node.nodeType === 3) {
      const t = (node.text ?? '').trim();
      if (t) out.push(t);
      return;
    }
    for (const child of node.childNodes ?? []) {
      visit(child as { nodeType: number; text?: string; childNodes?: unknown[] });
    }
  };
  visit(el);
  return out;
}

function streetAddressLines(path: string): string[] {
  return textNodes(main(path)).filter((line) => STREET_ADDRESS.test(line));
}

/** Substantive paragraphs of the markdown body region (excludes shared chrome). */
function bodyParagraphs(path: string): string[] {
  const body = main(path).querySelector('.loc-body');
  if (!body) throw new Error(`no .loc-body in ${path}`);
  return body
    .querySelectorAll('p')
    .map((p) => norm(p.text).trim())
    .filter((t) => t.length >= 60);
}

describe('locations cluster', () => {
  it('builds all six pages with exactly one H1 and a self canonical', () => {
    for (const path of ALL_LOCATION_PATHS) {
      const doc = parseDist(path);
      expect(doc.querySelectorAll('h1').length, path).toBe(1);
      expect(
        doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        path,
      ).toBe(`${SITE.domain}/${path}/`);
    }
  });

  it('gives every page a unique title within limits and a real meta description', () => {
    const titles = ALL_LOCATION_PATHS.map(
      (path) => parseDist(path).querySelector('title')?.text ?? '',
    );
    expect(new Set(titles).size).toBe(ALL_LOCATION_PATHS.length);
    for (const title of titles) {
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(70);
    }
    for (const path of ALL_LOCATION_PATHS) {
      const desc =
        parseDist(path).querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
      expect(desc.length, path).toBeGreaterThanOrEqual(70);
      expect(desc.length, path).toBeLessThanOrEqual(165);
    }
  });

  it('contains no em dashes or banned strings anywhere in the cluster', () => {
    for (const path of ALL_LOCATION_PATHS) {
      const html = distFile(path);
      expect(html, path).not.toContain('—');
      expect(html, path).not.toContain('231 S. Bemiston');
      expect(html, path).not.toContain('Schedule a Consultation');
    }
  });

  it('emits no business-listing or rating schema anywhere in /locations/**', () => {
    for (const path of ALL_LOCATION_PATHS) {
      const html = distFile(path);
      expect(html, path).not.toContain('LocalBusiness');
      expect(html, path).not.toContain('PostalAddress');
      expect(html, path).not.toContain('aggregateRating');
      const blocks = jsonld(path); // throws if any block fails JSON.parse
      expect(blocks.length, path).toBeGreaterThanOrEqual(1);
      for (const block of blocks) {
        expect(block['@type'], path).toBe('BreadcrumbList');
      }
    }
  });

  it('renders breadcrumb JSON-LD whose final item is the page itself', () => {
    for (const path of ALL_LOCATION_PATHS) {
      const crumbs = jsonld(path).find((b) => b['@type'] === 'BreadcrumbList');
      expect(crumbs, path).toBeTruthy();
      expect(crumbs!.itemListElement[0].name).toBe('Home');
      expect(crumbs!.itemListElement.at(-1).item).toBe(`${SITE.domain}/${path}/`);
    }
  });

  it('shows no street address pattern on any location page', () => {
    for (const path of ALL_LOCATION_PATHS) {
      expect(streetAddressLines(path), path).toEqual([]);
    }
  });

  it('keeps the conflict-check CTA reachable from every location page', () => {
    for (const path of ALL_LOCATION_PATHS) {
      const hrefs = main(path)
        .querySelectorAll('a')
        .map((a) => a.getAttribute('href'));
      expect(hrefs, path).toContain('/refer-a-case/');
    }
  });
});

describe('nationwide coverage hub', () => {
  it('carries the neutrality statement and the plan-mandated terms', () => {
    const text = mainText(HUB);
    expect(text).toContain(SITE.neutralityStatement);
    for (const term of ['remote', 'deposition', 'trial', 'travel']) {
      expect(text.toLowerCase()).toContain(term);
    }
  });

  it('covers the full section 9 topic list', () => {
    const text = mainText(HUB);
    expect(text).toContain('all 50 states');
    expect(text.toLowerCase()).toContain('federal');
    expect(text).toContain('Canadian');
    expect(text).toContain('Bureau of Labor Statistics');
    expect(text).toContain('OEWS');
    expect(text).toContain('O*NET');
    expect(text).toContain('state workforce');
    expect(text.toLowerCase()).toContain('medical cost');
    expect(text.toLowerCase()).toContain('licens');
    expect(text).toContain('independent economist');
  });

  it('links to every metro page and to services', () => {
    const hrefs = main(HUB)
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    for (const metro of METROS) {
      expect(hrefs).toContain(`/locations/${metro.slug}/`);
    }
    expect(hrefs.some((h) => h?.startsWith('/services/'))).toBe(true);
  });

  it('renders the proof band from SITE.stats only', () => {
    const text = mainText(HUB);
    for (const stat of SITE.stats) {
      expect(text).toContain(stat.value);
      expect(text).toContain(stat.label);
    }
  });
});

describe('metro pages', () => {
  it('uses honest by-appointment language on every metro page', () => {
    for (const metro of METROS) {
      const text = mainText(`locations/${metro.slug}`).toLowerCase();
      expect(text, metro.slug).toContain('by appointment');
    }
  });

  it('names the metro in the H1; the neutrality statement stays hub-only', () => {
    for (const metro of METROS) {
      const path = `locations/${metro.slug}`;
      const h1 = norm(parseDist(path).querySelector('h1')!.text);
      expect(h1, metro.slug).toContain(metro.city);
      // Among location pages the neutrality statement is mandated on the
      // nationwide hub only (sitewide suite 10); tiered pages omit it.
      expect(mainText(path)).not.toContain(SITE.neutralityStatement);
    }
  });

  it('office panel appears on all four office metro pages and nowhere else sampled', () => {
    for (const m of METROS) {
      expect(main(`locations/${m.slug}`).querySelector('.loc-office-facts')).toBeTruthy();
    }
    expect(main(HUB).querySelector('.loc-office-facts')).toBeNull();
  });

  it('gives each metro a substantive body of at least 300 words', () => {
    for (const metro of METROS) {
      const body = main(`locations/${metro.slug}`).querySelector('.loc-body');
      expect(body, metro.slug).toBeTruthy();
      const words = norm(body!.text).split(/\s+/).filter(Boolean).length;
      expect(words, metro.slug).toBeGreaterThanOrEqual(300);
    }
  });

  it('shares no body paragraph between any two location pages (no thin duplication)', () => {
    const pages = [HUB, ...METROS.map((m) => `locations/${m.slug}`)];
    const seen = new Map<string, string>();
    for (const path of pages) {
      for (const para of bodyParagraphs(path)) {
        const origin = seen.get(para);
        expect(origin, `paragraph duplicated between ${origin} and ${path}`).toBeUndefined();
        seen.set(para, path);
      }
    }
  });

  it('links each metro back to the hub and out to at least one service', () => {
    for (const metro of METROS) {
      const hrefs = main(`locations/${metro.slug}`)
        .querySelectorAll('a')
        .map((a) => a.getAttribute('href'));
      expect(hrefs, metro.slug).toContain('/locations/nationwide/');
      expect(hrefs.some((h) => h?.startsWith('/services/')), metro.slug).toBe(true);
    }
  });
});

describe('locations index', () => {
  it('routes to the hub and all four metro pages', () => {
    const hrefs = main(INDEX)
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/locations/nationwide/');
    for (const metro of METROS) {
      expect(hrefs).toContain(`/locations/${metro.slug}/`);
    }
  });
});

describe('state hub pages', () => {
  it('all 50 states build with unique titles and their own court names', () => {
    const titles = new Set<string>();
    for (const s of geoStates()) {
      const html = distFile(`locations/${s.slug}`);
      const title = html.match(/<title>([^<]+)<\/title>/)![1];
      expect(titles.has(title), s.slug).toBe(false);
      titles.add(title);
      expect(mainText(`locations/${s.slug}`)).toContain(s.trialCourts);
    }
  });
  it('locations index links every state', () => {
    const html = distFile('locations');
    for (const s of geoStates()) expect(html, s.slug).toContain(`href="/locations/${s.slug}/"`);
  });
});

describe('metro pages', () => {
  it('every metro builds and names its first county', () => {
    for (const m of geoMetros()) {
      const text = mainText(`locations/${m.stateSlug}/${m.slug}`);
      expect(text, `${m.stateSlug}/${m.slug}`).toContain(m.counties[0].name);
    }
  });
  it('every state hub links each of its metros', () => {
    for (const m of geoMetros()) {
      expect(distFile(`locations/${m.stateSlug}`), m.slug).toContain(`href="/locations/${m.stateSlug}/${m.slug}/"`);
    }
  });
});

describe('town pages', () => {
  // On main today the town-page waves have not merged yet, so `dist/` has
  // zero town pages and the loop below runs zero iterations - the test
  // passes vacuously. As each weekly wave PR (per LAUNCH-CHECKLIST.md's
  // locations rollout calendar) lands its town pages in `dist/`, this test
  // starts actually asserting against them.
  it('names its own county in the body text of every built town page', () => {
    const DIST = join(process.cwd(), 'dist');
    for (const t of geoTowns()) {
      const path = `locations/${t.stateSlug}/${t.metroSlug}/${t.slug}`;
      if (!existsSync(join(DIST, path, 'index.html'))) continue;
      expect(mainText(path), path).toContain(t.county);
    }
  });
});
