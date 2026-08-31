import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

const H1_EXACT =
  'Nationwide Vocational Expert, Life Care Planning, and Economic Damages Services';

const SERVICE_SLUGS = [
  'vocational-expert-witness',
  'life-care-planning',
  'medical-cost-projection',
  'forensic-economic-damages',
  'rebuttal-peer-review',
  'expert-testimony-litigation-consulting',
  'coordinated-damages-assessment',
];

const CHECKLIST_SLUGS = [
  'vocational-evaluation-records-checklist',
  'life-care-plan-records-checklist',
  'economic-loss-records-checklist',
];

/** Astro escapes entities in rendered text; normalize for comparisons. */
function norm(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** Homepage <main> text with all script bodies (JSON-LD included) removed. */
function mainText(): string {
  const main = parseDist('').querySelector('main');
  if (!main) throw new Error('no <main> on homepage');
  main.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
  return norm(main.text);
}

function allHrefs(): string[] {
  return parseDist('')
    .querySelectorAll('a')
    .map((a) => a.getAttribute('href'))
    .filter((h): h is string => Boolean(h));
}

describe('homepage (12-section national positioning)', () => {
  it('renders exactly one H1 with the exact spec headline', () => {
    const h1s = parseDist('').querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(norm(h1s[0].text).trim()).toBe(H1_EXACT);
    // The headline is sourced from the entity record, not hardcoded copy.
    expect(SITE.tagline).toBe(H1_EXACT);
  });

  it('hero carries the strategy plan hero copy', () => {
    expect(mainText()).toContain(
      'objective litigation support for plaintiff and defense counsel',
    );
  });

  it('renders the primary conflict-check CTA and the CV/fee secondary CTA', () => {
    const doc = parseDist('');
    const primary = doc
      .querySelectorAll('a[href="/refer-a-case/"]')
      .map((a) => norm(a.text).trim());
    expect(primary).toContain('Request a Conflict Check');
    const secondary = doc
      .querySelectorAll('a[href="/contact/#cv-fee"]')
      .map((a) => norm(a.text).trim());
    expect(secondary).toContain('Request CVs and Fee Information');
  });

  it('shows the urgent-deadline phone strip', () => {
    const doc = parseDist('');
    const telLinks = doc.querySelectorAll(`a[href="tel:${SITE.phoneE164}"]`);
    expect(telLinks.length).toBeGreaterThanOrEqual(1);
    const text = mainText();
    expect(text).toContain(SITE.phoneDisplay);
    expect(text).toContain('Imminent disclosure, deposition, or trial deadline?');
  });

  it('links all seven service pages', () => {
    const links = allHrefs();
    for (const slug of SERVICE_SLUGS) {
      expect(links).toContain(`/services/${slug}/`);
    }
  });

  it('links at least six matter pages', () => {
    const matterLinks = new Set(
      allHrefs().filter((h) => /^\/matters\/[a-z0-9-]+\/$/.test(h)),
    );
    expect(matterLinks.size).toBeGreaterThanOrEqual(6);
  });

  it('emits Organization and WebSite JSON-LD from the entity record', () => {
    const blocks = jsonld('');
    const org = blocks.find((b) => b['@type'] === 'Organization');
    const webSite = blocks.find((b) => b['@type'] === 'WebSite');
    expect(org).toBeTruthy();
    expect(org.name).toBe(SITE.legalName);
    expect(org.telephone).toBe(SITE.phoneE164);
    expect(org.sameAs).toEqual([...SITE.sameAs]);
    expect(webSite).toBeTruthy();
    expect(webSite.url).toBe(`${SITE.domain}/`);
    // No fabricated-schema types on the entity blocks ("review" appears in FAQ
    // prose legitimately, so the ban is scoped to Organization and WebSite).
    expect(JSON.stringify([org, webSite])).not.toMatch(
      /LocalBusiness|aggregateRating|"review"|reviewRating/i,
    );
  });

  it('renders the proof band from SITE.stats', () => {
    const text = mainText();
    for (const stat of SITE.stats) {
      expect(text).toContain(stat.value);
      expect(text).toContain(stat.label);
    }
  });

  it('carries the neutrality statement and the four-step process', () => {
    const text = mainText();
    expect(text).toContain(SITE.neutralityStatement);
    const steps = parseDist('').querySelectorAll('.process-steps > li');
    expect(steps.length).toBe(4);
    expect(norm(steps[0].text)).toContain('Conflict check and scope');
    expect(norm(steps[3].text)).toContain('Deposition, mediation, and trial support');
  });

  it('renders a photo-less expert card linking the profile', () => {
    const card = parseDist('').querySelector('.expert-card');
    expect(card).toBeTruthy();
    const text = norm(card!.text);
    expect(text).toContain(SITE.principal);
    expect(text).toContain(SITE.principalCreds);
    expect(text).toContain('American Rehabilitation Economics Association');
    expect(text).toContain('independent economist partners');
    expect(card!.querySelectorAll('img').length).toBe(0);
    const links = card!.querySelectorAll('a').map((a) => a.getAttribute('href'));
    expect(links).toContain('/experts/jason-purinton/');
  });

  it('links the coordinated assessment, national coverage hub, and featured checklists', () => {
    const links = allHrefs();
    expect(links).toContain('/services/coordinated-damages-assessment/');
    expect(links).toContain('/locations/nationwide/');
    for (const slug of CHECKLIST_SLUGS) {
      expect(links).toContain(`/resources/${slug}/`);
    }
  });

  it('renders 4 to 6 referral FAQs with matching FAQPage JSON-LD', () => {
    const faqPage = jsonld('').find((b) => b['@type'] === 'FAQPage');
    expect(faqPage).toBeTruthy();
    expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(4);
    expect(faqPage.mainEntity.length).toBeLessThanOrEqual(6);
    const text = mainText();
    for (const q of faqPage.mainEntity) {
      expect(text).toContain(norm(q.name));
      expect(text).toContain(norm(q.acceptedAnswer.text));
    }
  });

  it('contains no em dashes and no banned phrasing', () => {
    const html = distFile('');
    expect(html).not.toContain('—');
    expect(html).not.toContain('Schedule a Consultation');
    expect(html).not.toContain('231 S. Bemiston');
  });
});
