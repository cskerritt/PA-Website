import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

/** All nine resource slugs, per the site inventory. */
const CHECKLISTS = [
  'vocational-evaluation-records-checklist',
  'life-care-plan-records-checklist',
  'economic-loss-records-checklist',
  'rebuttal-review-checklist',
] as const;

const RESOURCES = [
  ...CHECKLISTS,
  'expert-disclosure-deadline-worksheet',
  'vocational-expert-vs-economist-vs-life-care-planner',
  'catastrophic-damages-team-referral-guide',
  'faq',
  'glossary',
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

for (const slug of RESOURCES) {
  const page = `resources/${slug}`;
  const path = `/resources/${slug}/`;

  describe(`resource page ${slug}`, () => {
    it('renders exactly one H1 and a self-referencing canonical', () => {
      const doc = parseDist(page);
      expect(doc.querySelectorAll('h1').length).toBe(1);
      expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        SITE.domain + path,
      );
    });

    it('emits Article JSON-LD (not Service) with author, reviewer, and dates', () => {
      const blocks = jsonld(page);
      const types = blocks.map((b) => b['@type']);
      expect(types).not.toContain('Service');
      const article = blocks.find((b) => b['@type'] === 'Article');
      expect(article).toBeTruthy();
      expect(article.headline.length).toBeGreaterThan(5);
      expect(article.url).toBe(SITE.domain + path);
      expect(article.author.name).toBe(SITE.principal);
      expect(article.reviewedBy?.name).toBe('Jason C. Purinton');
      expect(article.datePublished).toBe('2026-08-31');
      expect(article.dateModified).toBeTruthy();
    });

    it('emits FAQPage and BreadcrumbList JSON-LD from the same data as the visible page', () => {
      const blocks = jsonld(page);
      const faqPage = blocks.find((b) => b['@type'] === 'FAQPage');
      expect(faqPage).toBeTruthy();
      expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(3);
      const text = mainText(page);
      for (const q of faqPage.mainEntity) {
        expect(text).toContain(norm(q.name));
        expect(text).toContain(norm(q.acceptedAnswer.text));
      }
      const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList');
      expect(crumbs).toBeTruthy();
      expect(crumbs.itemListElement[1].name).toBe('Resources');
      expect(crumbs.itemListElement.at(-1).item).toBe(SITE.domain + path);
    });

    it('shows the visible author, reviewer, and publication dates', () => {
      const text = mainText(page);
      expect(text).toContain('Written and reviewed by Jason C. Purinton');
      expect(text).toContain('Published August 31, 2026');
      expect(text).toContain('Updated August 31, 2026');
    });

    it('renders a print button', () => {
      const button = parseDist(page).querySelector('button.print-button');
      expect(button).toBeTruthy();
      expect(norm(button!.text).trim()).toMatch(/^Print or save this /);
      expect(button!.getAttribute('onclick')).toContain('window.print()');
    });

    it('carries the conflict-check CTA and no banned CTA or content', () => {
      const doc = parseDist(page);
      const referLinks = doc
        .querySelectorAll('a[href="/refer-a-case/"]')
        .map((a) => norm(a.text).trim());
      expect(referLinks).toContain('Request a Conflict Check');
      const html = distFile(page);
      expect(html).not.toContain('Schedule a Consultation');
      expect(html).not.toContain('231 S. Bemiston');
      expect(html).not.toContain('—');
      expect(doc.querySelector('input[type="file"]')).toBeNull();
    });

    it('links at least one real https citation', () => {
      const hrefs = parseDist(page)
        .querySelectorAll('.citations-list a')
        .map((a) => a.getAttribute('href') ?? '');
      expect(hrefs.length).toBeGreaterThanOrEqual(1);
      for (const href of hrefs) {
        expect(href).toMatch(/^https:\/\//);
      }
    });

    it('renders a substantive body (>= 400 words in main)', () => {
      const words = mainText(page).split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(400);
    });

    it('keeps the page title within 70 characters', () => {
      const title = parseDist(page).querySelector('title')?.text ?? '';
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(70);
    });
  });
}

describe('checklist resources', () => {
  for (const slug of CHECKLISTS) {
    it(`${slug} renders a comprehensive printable checklist (>= 15 items)`, () => {
      const items = parseDist(`resources/${slug}`).querySelectorAll('.checklist li');
      expect(items.length).toBeGreaterThanOrEqual(15);
      expect(norm(parseDist(`resources/${slug}`).text)).toContain('Print or save this checklist');
    });
  }

  it('economic loss checklist attributes signed analyses to independent economist partners', () => {
    expect(mainText('resources/economic-loss-records-checklist')).toContain(
      'performed and signed by independent economist partners',
    );
  });
});

describe('deadline worksheet', () => {
  const page = 'resources/expert-disclosure-deadline-worksheet';

  it('renders fill-in planning tables working backward from trial', () => {
    const doc = parseDist(page);
    const tables = doc.querySelector('main')!.querySelectorAll('table');
    expect(tables.length).toBeGreaterThanOrEqual(2);
    const headers = doc.querySelectorAll('th').map((th) => norm(th.text).trim());
    expect(headers).toContain('Your date');
    const text = mainText(page);
    expect(text).toContain('Trial date');
    expect(text).toMatch(/Rule 26\(a\)\(2\)\(D\)/);
    expect(text).toContain('90 days');
    expect(text).toContain('30 days');
  });

  it('frames federal defaults as defaults, not advice', () => {
    const text = mainText(page);
    expect(text.toLowerCase()).toContain('not legal advice');
    expect(text).toContain('scheduling order');
  });
});

describe('role-boundaries guide', () => {
  const page = 'resources/vocational-expert-vs-economist-vs-life-care-planner';

  it('renders the role comparison matrix with all three disciplines', () => {
    const doc = parseDist(page);
    expect(doc.querySelector('main')!.querySelectorAll('table').length).toBeGreaterThanOrEqual(1);
    const text = mainText(page);
    expect(text).toContain('Vocational expert');
    expect(text).toContain('Life care planner');
    expect(text).toContain('Forensic economist');
    expect(text).toContain('Signs');
  });

  it('states that economic analyses are performed and signed by independent economist partners', () => {
    expect(mainText(page)).toContain('performed and sign');
    expect(mainText(page)).toContain('independent economist partners');
  });
});

describe('catastrophic team referral guide', () => {
  it('covers the coordinated team and preserves role separation', () => {
    const text = mainText('resources/catastrophic-damages-team-referral-guide');
    expect(text.toLowerCase()).toContain('life care plan');
    expect(text).toContain('independent economist');
    expect(text.toLowerCase()).toContain('conflict check');
  });
});

describe('faq resource', () => {
  it('answers at least 12 referral questions, mirrored into FAQPage JSON-LD', () => {
    const faqPage = jsonld('resources/faq').find((b) => b['@type'] === 'FAQPage');
    expect(faqPage).toBeTruthy();
    expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(12);
    const visibleQuestions = parseDist('resources/faq').querySelectorAll('.faq-item h3');
    expect(visibleQuestions.length).toBeGreaterThanOrEqual(12);
  });
});

describe('glossary resource', () => {
  it('defines at least 25 terms', () => {
    const terms = parseDist('resources/glossary').querySelectorAll('.tp-body h3');
    expect(terms.length).toBeGreaterThanOrEqual(25);
    const text = mainText('resources/glossary');
    for (const term of [
      'Employability',
      'Placeability',
      'Earning capacity',
      'Worklife expectancy',
      'Present value',
      'Mitigation',
      'Maximum medical improvement',
    ]) {
      expect(text).toContain(term);
    }
  });
});

describe('resources index', () => {
  it('has one H1 and groups cards under Checklists, Guides, and Reference', () => {
    const doc = parseDist('resources');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const h2s = doc
      .querySelector('main')!
      .querySelectorAll('h2')
      .map((h) => norm(h.text).trim());
    expect(h2s).toContain('Checklists');
    expect(h2s).toContain('Guides');
    expect(h2s).toContain('Reference');
  });

  it('links every resource page', () => {
    const hrefs = parseDist('resources')
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    for (const slug of RESOURCES) {
      expect(hrefs).toContain(`/resources/${slug}/`);
    }
  });

  it('contains no em dashes and keeps the canonical on the config domain', () => {
    expect(distFile('resources')).not.toContain('—');
    expect(parseDist('resources').querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE.domain}/resources/`,
    );
  });
});
