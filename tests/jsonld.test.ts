import { describe, it, expect } from 'vitest';
import { SITE } from '../src/config/site';
import { orgJsonLd, personJsonLd, serviceJsonLd, faqJsonLd, breadcrumbJsonLd } from '../src/lib/jsonld';

describe('jsonld', () => {
  it('org matches entity record', () => {
    const o = orgJsonLd();
    expect(o['@type']).toBe('Organization');
    expect(o.name).toBe(SITE.legalName);
    expect(o.telephone).toBe(SITE.phoneE164);
    expect(o.sameAs).toEqual(SITE.sameAs);
    expect(JSON.stringify(o)).not.toMatch(/LocalBusiness|aggregateRating|review/i);
  });
  it('person carries credentials and affiliations', () => {
    const p = personJsonLd();
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('Jason C. Purinton');
    expect(JSON.stringify(p)).toContain('American Rehabilitation Economics Association');
  });
  it('service sets provider and national areaServed', () => {
    const s = serviceJsonLd({ name: 'X', description: 'Y', path: '/services/x/' });
    expect(s.provider.name).toBe(SITE.legalName);
    expect(s.areaServed['@type']).toBe('Country');
  });
  it('faq and breadcrumb shape', () => {
    expect(faqJsonLd([{ q: 'a?', a: 'b' }]).mainEntity[0]['@type']).toBe('Question');
    expect(breadcrumbJsonLd([{ name: 'Home', path: '/' }]).itemListElement[0].position).toBe(1);
  });
});
