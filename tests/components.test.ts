import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

const PAGE = 'services/vocational-expert-witness';

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

describe('exemplar service page (13-point template)', () => {
  it('renders exactly one H1 with the frontmatter h1', () => {
    const doc = parseDist(PAGE);
    const h1s = doc.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(norm(h1s[0].text).trim()).toBe('Nationwide Vocational Expert Witness Services');
  });

  it('carries the neutrality statement in the page body', () => {
    expect(mainText(PAGE)).toContain(SITE.neutralityStatement);
  });

  it('renders the direct answer lead box', () => {
    const box = parseDist(PAGE).querySelector('.direct-answer');
    expect(box).toBeTruthy();
    expect(norm(box!.text)).toContain('employability, placeability, earning capacity');
  });

  it('renders the conflict-check CTA band with phone strip', () => {
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

  it('emits Service, FAQPage, and BreadcrumbList JSON-LD generated from page data', () => {
    const blocks = jsonld(PAGE);
    const byType = Object.fromEntries(blocks.map((b) => [b['@type'], b]));
    expect(byType.Service).toBeTruthy();
    expect(byType.Service.provider.name).toBe(SITE.legalName);
    expect(byType.Service.areaServed['@type']).toBe('Country');
    expect(byType.Service.url).toBe(`${SITE.domain}/services/vocational-expert-witness/`);
    expect(byType.FAQPage).toBeTruthy();
    expect(byType.FAQPage.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(byType.BreadcrumbList).toBeTruthy();
    expect(byType.BreadcrumbList.itemListElement[0].name).toBe('Home');
    expect(byType.BreadcrumbList.itemListElement.at(-1).item).toBe(
      `${SITE.domain}/services/vocational-expert-witness/`,
    );
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
    expect(h2s).toContain('Questions this evaluation addresses');
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
    expect(text).toContain('Published August 31, 2026');
    expect(text).toContain('Updated August 31, 2026');
  });

  it('links real, checkable citations', () => {
    const hrefs = parseDist(PAGE)
      .querySelectorAll('.citations-list a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://www.bls.gov/oes/');
    expect(hrefs).toContain('https://www.onetonline.org/');
    expect(hrefs).toContain('https://abve.net/');
  });

  it('renders a substantive body (>= 1200 words in main)', () => {
    const words = mainText(PAGE).split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(1200);
  });

  it('contains no em dashes anywhere in the page', () => {
    expect(distFile(PAGE)).not.toContain('—');
  });
});

const SERVICE_SLUGS = [
  'vocational-expert-witness',
  'life-care-planning',
  'medical-cost-projection',
  'forensic-economic-damages',
  'rebuttal-peer-review',
  'expert-testimony-litigation-consulting',
  'coordinated-damages-assessment',
] as const;

describe.each(SERVICE_SLUGS.map((slug) => ({ slug })))(
  'service page invariants: $slug',
  ({ slug }) => {
    const page = `services/${slug}`;
    const url = `${SITE.domain}/services/${slug}/`;

    it('renders exactly one H1', () => {
      expect(parseDist(page).querySelectorAll('h1').length).toBe(1);
    });

    it('renders the direct answer lead box', () => {
      const box = parseDist(page).querySelector('.direct-answer');
      expect(box).toBeTruthy();
      expect(norm(box!.text).trim().length).toBeGreaterThanOrEqual(200);
    });

    it('carries the neutrality statement in the page body', () => {
      expect(mainText(page)).toContain(SITE.neutralityStatement);
    });

    it('renders the conflict-check CTA band with phone strip', () => {
      const doc = parseDist(page);
      const primary = doc
        .querySelectorAll('a[href="/refer-a-case/"]')
        .map((a) => norm(a.text).trim());
      expect(primary).toContain('Request a Conflict Check');
      const secondary = doc
        .querySelectorAll('a[href="/contact/#cv-fee"]')
        .map((a) => norm(a.text).trim());
      expect(secondary).toContain('Request CVs and Fee Information');
      expect(mainText(page)).toContain(SITE.phoneDisplay);
    });

    it('emits Service, FAQPage, and BreadcrumbList JSON-LD for this page', () => {
      const blocks = jsonld(page);
      const byType = Object.fromEntries(blocks.map((b) => [b['@type'], b]));
      expect(byType.Service).toBeTruthy();
      expect(byType.Service.provider.name).toBe(SITE.legalName);
      expect(byType.Service.areaServed['@type']).toBe('Country');
      expect(byType.Service.url).toBe(url);
      expect(byType.FAQPage).toBeTruthy();
      expect(byType.FAQPage.mainEntity.length).toBeGreaterThanOrEqual(3);
      expect(byType.BreadcrumbList).toBeTruthy();
      expect(byType.BreadcrumbList.itemListElement[0].name).toBe('Home');
      expect(byType.BreadcrumbList.itemListElement.at(-1).item).toBe(url);
    });

    it('FAQ JSON-LD matches the visible FAQ content (no schema drift)', () => {
      const faqPage = jsonld(page).find((b) => b['@type'] === 'FAQPage');
      expect(faqPage).toBeTruthy();
      const text = mainText(page);
      for (const q of faqPage!.mainEntity) {
        expect(text).toContain(norm(q.name));
        expect(text).toContain(norm(q.acceptedAnswer.text));
      }
    });

    it('renders the 13-point template sections', () => {
      const h2s = parseDist(page)
        .querySelector('main')!
        .querySelectorAll('h2')
        .map((h) => norm(h.text).trim());
      expect(h2s).toContain('Questions this evaluation addresses');
      expect(h2s).toContain('Appropriate uses');
      expect(h2s).toContain('Limitations and inappropriate uses');
      expect(h2s).toContain('Records typically requested');
      expect(h2s).toContain('Deliverables');
      expect(h2s).toContain('Frequently asked questions');
    });

    it('shows author, reviewer, and publication dates', () => {
      const text = mainText(page);
      expect(text).toContain('Jason C. Purinton');
      expect(text).toMatch(/Published \w+ \d{1,2}, \d{4}\./);
      expect(text).toMatch(/Updated \w+ \d{1,2}, \d{4}\./);
    });

    it('links at least one real https citation', () => {
      const hrefs = parseDist(page)
        .querySelectorAll('.citations-list a')
        .map((a) => a.getAttribute('href') ?? '');
      expect(hrefs.length).toBeGreaterThanOrEqual(1);
      for (const href of hrefs) expect(href).toMatch(/^https:\/\//);
    });

    it('renders a substantive body (>= 1200 words in main)', () => {
      const words = mainText(page).split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(1200);
    });

    it('contains no em dashes or banned strings anywhere in the page', () => {
      const html = distFile(page);
      expect(html).not.toContain('—');
      expect(html).not.toContain('231 S. Bemiston');
      expect(html).not.toContain('Schedule a Consultation');
    });
  },
);

describe('complete service cluster', () => {
  it('services index links every one of the 7 service pages', () => {
    const hrefs = parseDist('services')
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    for (const slug of SERVICE_SLUGS) {
      expect(hrefs).toContain(`/services/${slug}/`);
    }
  });

  it('titles and meta descriptions are unique across all 7 service pages', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const slug of SERVICE_SLUGS) {
      const doc = parseDist(`services/${slug}`);
      titles.add(norm(doc.querySelector('title')!.text).trim());
      descriptions.add(
        doc.querySelector('meta[name="description"]')!.getAttribute('content')!,
      );
    }
    expect(titles.size).toBe(SERVICE_SLUGS.length);
    expect(descriptions.size).toBe(SERVICE_SLUGS.length);
  });

  it('the forensic economics page states independent economist partners perform and sign analyses', () => {
    const text = mainText('services/forensic-economic-damages');
    expect(text).toContain('performed and signed by independent economist partners');
    expect(text).toContain('does not issue economist opinions');
  });
});

describe('services index', () => {
  it('has one H1 and lists the exemplar service', () => {
    const doc = parseDist('services');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const hrefs = doc.querySelectorAll('a').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/services/vocational-expert-witness/');
  });

  it('carries the neutrality statement and independent economist language', () => {
    const text = mainText('services');
    expect(text).toContain(SITE.neutralityStatement);
    expect(text).toContain('independent economist partners');
  });

  it('renders the proof band from SITE.stats and the four-step process', () => {
    const text = mainText('services');
    for (const stat of SITE.stats) {
      expect(text).toContain(stat.value);
      expect(text).toContain(stat.label);
    }
    const steps = parseDist('services').querySelectorAll('.process-steps > li');
    expect(steps.length).toBe(4);
    expect(norm(steps[0].text)).toContain('Conflict check and scope');
  });

  it('contains no em dashes anywhere in the page', () => {
    expect(distFile('services')).not.toContain('—');
  });
});
