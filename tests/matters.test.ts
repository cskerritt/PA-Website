import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

const MATTER_SLUGS = [
  'personal-injury',
  'medical-malpractice',
  'wrongful-death',
  'pediatric-birth-injury',
  'employment-litigation',
  'family-law',
  'workers-compensation',
  'erisa-long-term-disability',
  'product-liability-mass-tort',
  'veterans-tdiu',
] as const;

/** Astro escapes entities in rendered text; normalize both directions for comparisons. */
function norm(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** <main> text with all script bodies (JSON-LD included) removed. */
function mainText(path: string): string {
  const main = parseDist(path).querySelector('main');
  if (!main) throw new Error(`no <main> in ${path}`);
  main.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
  return norm(main.text);
}

describe.each(MATTER_SLUGS)('matter page: %s', (slug) => {
  const PAGE = `matters/${slug}`;
  const URL = `${SITE.domain}/matters/${slug}/`;

  it('renders exactly one H1', () => {
    expect(parseDist(PAGE).querySelectorAll('h1').length).toBe(1);
  });

  it('has a self-referencing canonical from SITE.domain', () => {
    expect(
      parseDist(PAGE).querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(URL);
  });

  it('carries the neutrality statement in the page body', () => {
    expect(mainText(PAGE)).toContain(SITE.neutralityStatement);
  });

  it('renders a substantive direct answer lead box', () => {
    const box = parseDist(PAGE).querySelector('.direct-answer');
    expect(box).toBeTruthy();
    expect(norm(box!.text).trim().length).toBeGreaterThanOrEqual(200);
  });

  it('renders the conflict-check CTA band with phone strip and no banned CTA', () => {
    const doc = parseDist(PAGE);
    const primary = doc
      .querySelectorAll('a[href="/refer-a-case/"]')
      .map((a) => norm(a.text).trim());
    expect(primary).toContain('Request a Conflict Check');
    const secondary = doc
      .querySelectorAll('a[href="/contact/#cv-fee"]')
      .map((a) => norm(a.text).trim());
    expect(secondary).toContain('Request CVs and Fee Information');
    const text = mainText(PAGE);
    expect(text).toContain('Imminent disclosure, deposition, or trial deadline?');
    expect(text).toContain(SITE.phoneDisplay);
    expect(distFile(PAGE)).not.toContain('Schedule a Consultation');
  });

  it('emits Article (not Service), FAQPage, and BreadcrumbList JSON-LD from page data', () => {
    const blocks = jsonld(PAGE);
    const byType = Object.fromEntries(blocks.map((b) => [b['@type'], b]));
    expect(byType.Service).toBeUndefined();
    expect(byType.Article).toBeTruthy();
    expect(byType.Article.url).toBe(URL);
    expect(byType.Article.author.name).toBe(SITE.principal);
    expect(byType.Article.publisher.name).toBe(SITE.legalName);
    expect(byType.Article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(byType.Article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(byType.FAQPage).toBeTruthy();
    expect(byType.FAQPage.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(byType.BreadcrumbList).toBeTruthy();
    expect(byType.BreadcrumbList.itemListElement[0].name).toBe('Home');
    expect(byType.BreadcrumbList.itemListElement[1].name).toBe('Matters');
    expect(byType.BreadcrumbList.itemListElement.at(-1).item).toBe(URL);
  });

  it('FAQ JSON-LD matches the visible FAQ content (no schema drift)', () => {
    const faqPage = jsonld(PAGE).find((b) => b['@type'] === 'FAQPage');
    expect(faqPage).toBeTruthy();
    const text = mainText(PAGE);
    for (const q of faqPage!.mainEntity) {
      expect(text).toContain(norm(q.name));
      expect(text).toContain(norm(q.acceptedAnswer.text));
    }
  });

  it('renders questions, uses, records, deliverables, and FAQ sections', () => {
    const doc = parseDist(PAGE);
    const h2s = doc
      .querySelector('main')!
      .querySelectorAll('h2')
      .map((h) => norm(h.text).trim());
    expect(h2s).toContain('Questions expert analysis addresses in these matters');
    expect(h2s).toContain('Appropriate uses');
    expect(h2s).toContain('Limitations and inappropriate uses');
    expect(h2s).toContain('Records typically requested');
    expect(h2s).toContain('Deliverables');
    expect(h2s).toContain('Frequently asked questions');
    expect(doc.querySelectorAll('.records-list li').length).toBeGreaterThanOrEqual(3);
  });

  it('shows author, reviewer, and publication dates', () => {
    const text = mainText(PAGE);
    expect(text).toContain('Written and reviewed by Jason C. Purinton');
    expect(text).toMatch(/Published \w+ \d{1,2}, \d{4}/);
    expect(text).toMatch(/Updated \w+ \d{1,2}, \d{4}/);
  });

  it('links real, checkable https citations', () => {
    const hrefs = parseDist(PAGE)
      .querySelectorAll('.citations-list a')
      .map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\//);
    }
    // At least one citation from a government or professional-standards source.
    expect(
      hrefs.some((h) =>
        /\.gov\/|\.gov$|onetonline\.org|rehabpro\.org|abve\.net|law\.cornell\.edu/.test(h),
      ),
    ).toBe(true);
  });

  it('renders related service cards (2-3 service slugs per matter)', () => {
    const related = parseDist(PAGE).querySelector('.tp-related');
    expect(related).toBeTruthy();
    const hrefs = related!
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/services/'));
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
  });

  it('mentions independent economist partners (economic role boundary)', () => {
    expect(mainText(PAGE)).toContain('independent economist partners');
  });

  it('renders a substantive page (>= 1200 words in main, ~800+ word body)', () => {
    const words = mainText(PAGE).split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(1200);
  });

  it('contains no em dashes or banned strings anywhere in the page', () => {
    const html = distFile(PAGE);
    expect(html).not.toContain('—');
    expect(html).not.toContain('231 S. Bemiston');
    expect(html).not.toContain('LocalBusiness');
    expect(html).not.toContain('aggregateRating');
  });
});

describe('matter pages as a set', () => {
  it('titles are unique across all matter pages', () => {
    const titles = MATTER_SLUGS.map(
      (slug) => parseDist(`matters/${slug}`).querySelector('title')?.text ?? '',
    );
    expect(new Set(titles).size).toBe(MATTER_SLUGS.length);
    for (const t of titles) expect(t.length).toBeGreaterThan(0);
  });

  it('meta descriptions are unique across all matter pages', () => {
    const descs = MATTER_SLUGS.map(
      (slug) =>
        parseDist(`matters/${slug}`)
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? '',
    );
    expect(new Set(descs).size).toBe(MATTER_SLUGS.length);
    for (const d of descs) expect(d.length).toBeGreaterThanOrEqual(70);
  });

  it('FAQ questions are distinct across all matter pages', () => {
    const questions: string[] = [];
    for (const slug of MATTER_SLUGS) {
      const faqPage = jsonld(`matters/${slug}`).find((b) => b['@type'] === 'FAQPage');
      expect(faqPage).toBeTruthy();
      for (const q of faqPage!.mainEntity) questions.push(norm(q.name).trim());
    }
    const dupes = questions.filter((q, i) => questions.indexOf(q) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('matters index', () => {
  it('has one H1 and links every matter page', () => {
    const doc = parseDist('matters');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const hrefs = doc.querySelectorAll('a').map((a) => a.getAttribute('href'));
    for (const slug of MATTER_SLUGS) {
      expect(hrefs).toContain(`/matters/${slug}/`);
    }
  });

  it('carries the neutrality statement and independent economist language', () => {
    const text = mainText('matters');
    expect(text).toContain(SITE.neutralityStatement);
    expect(text).toContain('independent economist partners');
  });

  it('has a canonical URL and links to the referral funnel', () => {
    const doc = parseDist('matters');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE.domain}/matters/`,
    );
    const hrefs = doc.querySelectorAll('a').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/refer-a-case/');
  });

  it('contains no em dashes anywhere in the page', () => {
    expect(distFile('matters')).not.toContain('—');
  });
});
