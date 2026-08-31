import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

const PROFILE = 'experts/jason-purinton';
const INDEX = 'experts';

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

/** Elements whose class suggests a credential logo badge strip (banned). */
function badgeStripElements(path: string) {
  return parseDist(path).querySelectorAll('[class*="badge"], [class*="logo-strip"]');
}

describe('expert profile (/experts/jason-purinton/)', () => {
  it('renders exactly one H1 naming the principal with his credentials', () => {
    const h1s = parseDist(PROFILE).querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(norm(h1s[0].text)).toContain(SITE.principal);
    expect(norm(h1s[0].text)).toContain(SITE.principalCreds);
  });

  it('emits Person JSON-LD generated from the entity record', () => {
    const person = jsonld(PROFILE).find((b) => b['@type'] === 'Person');
    expect(person).toBeTruthy();
    expect(person!.name).toBe('Jason C. Purinton');
    expect(person!.honorificSuffix).toBe(SITE.principalCreds);
    expect(person!.worksFor.name).toBe(SITE.legalName);
    expect(person!.url).toBe(`${SITE.domain}/experts/jason-purinton/`);
    expect(person!.hasCredential.length).toBeGreaterThanOrEqual(6);
    expect(person!.sameAs).toContain('https://www.linkedin.com/in/pa-expert');
    const blob = JSON.stringify(person);
    expect(blob).toContain('American Rehabilitation Economics Association');
    expect(blob).toContain('American Board of Vocational Experts');
    expect(blob).not.toMatch(/LocalBusiness|aggregateRating|review/i);
  });

  it('emits BreadcrumbList JSON-LD ending at the profile URL', () => {
    const bc = jsonld(PROFILE).find((b) => b['@type'] === 'BreadcrumbList');
    expect(bc).toBeTruthy();
    expect(bc!.itemListElement[0].name).toBe('Home');
    expect(bc!.itemListElement.at(-1).item).toBe(`${SITE.domain}/experts/jason-purinton/`);
  });

  it('displays every credential token as visible text (no logo badge strips)', () => {
    const text = mainText(PROFILE);
    for (const token of ['LPC', 'CRC', 'CVE', 'CLCP', 'ABVE/F', 'IPEC']) {
      expect(text).toContain(token);
    }
    for (const full of [
      'Licensed Professional Counselor',
      'Certified Rehabilitation Counselor',
      'Certified Vocational Evaluator',
      'Certified Life Care Planner',
    ]) {
      expect(text).toContain(full);
    }
    expect(badgeStripElements(PROFILE).length).toBe(0);
    expect(parseDist(PROFILE).querySelector('main')!.querySelectorAll('img').length).toBe(0);
  });

  it('shows professional leadership (AREA presidency, ABVE board)', () => {
    const text = mainText(PROFILE);
    expect(text).toContain('President');
    expect(text).toContain('American Rehabilitation Economics Association');
    expect(text).toContain('Board of Directors');
    expect(text).toContain('American Board of Vocational Experts');
  });

  it('carries the neutrality statement', () => {
    expect(mainText(PROFILE)).toContain(SITE.neutralityStatement);
  });

  it('states the independent-economist role boundary explicitly', () => {
    const lower = mainText(PROFILE).toLowerCase();
    expect(lower).toContain('independent economist partners');
    expect(lower).toContain('does not perform or sign forensic economic damages analyses');
  });

  it('describes nationwide testimony availability, remote and in person', () => {
    const lower = mainText(PROFILE).toLowerCase();
    expect(lower).toContain('nationwide');
    expect(lower).toContain('remote');
    expect(lower).toContain('deposition');
    expect(lower).toContain('trial');
  });

  it('renders displayed figures only from SITE.stats', () => {
    expect(mainText(PROFILE)).toContain(`${SITE.stats[0].value} ${SITE.stats[0].label}`);
  });

  it('uses the conflict-check CTA, never "Schedule a Consultation"', () => {
    const labels = parseDist(PROFILE)
      .querySelectorAll('a[href="/refer-a-case/"]')
      .map((a) => norm(a.text).trim());
    expect(labels).toContain('Request a Conflict Check');
    expect(distFile(PROFILE)).not.toContain('Schedule a Consultation');
  });

  it('contains no em dashes anywhere in the page', () => {
    expect(distFile(PROFILE)).not.toContain('—');
  });
});

describe('experts index (/experts/)', () => {
  it('renders exactly one H1', () => {
    expect(parseDist(INDEX).querySelectorAll('h1').length).toBe(1);
  });

  it('links to the full profile and shows the principal card with credentials', () => {
    const doc = parseDist(INDEX);
    const hrefs = doc.querySelectorAll('a').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/experts/jason-purinton/');
    expect(mainText(INDEX)).toContain(SITE.principalCreds);
  });

  it('explains that independent economists perform and sign economic analyses', () => {
    const text = mainText(INDEX);
    expect(text.toLowerCase()).toContain('independent economist');
    expect(text).toContain('Forensic Economics Partners');
    expect(text).toContain('performed and signed by independent economists');
    expect(text).toContain('not by Jason Purinton');
  });

  it('invites CV and fee requests through the contact page', () => {
    const hrefs = parseDist(INDEX)
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/contact/#cv-fee');
  });

  it('carries the neutrality statement', () => {
    expect(mainText(INDEX)).toContain(SITE.neutralityStatement);
  });

  it('has no credential logo badge strips and no images in the roster', () => {
    expect(badgeStripElements(INDEX).length).toBe(0);
    expect(parseDist(INDEX).querySelector('main')!.querySelectorAll('img').length).toBe(0);
  });

  it('uses the conflict-check CTA and contains no em dashes', () => {
    const labels = parseDist(INDEX)
      .querySelectorAll('a[href="/refer-a-case/"]')
      .map((a) => norm(a.text).trim());
    expect(labels).toContain('Request a Conflict Check');
    expect(distFile(INDEX)).not.toContain('Schedule a Consultation');
    expect(distFile(INDEX)).not.toContain('—');
  });
});
