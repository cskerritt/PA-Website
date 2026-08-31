import { SITE } from '../config/site';

const ORG_ID = `${SITE.domain}/#organization`;
const WEBSITE_ID = `${SITE.domain}/#website`;
const PERSON_ID = `${SITE.domain}/experts/jason-purinton/#person`;

/** Compact Organization reference for nesting inside other entities. */
function orgRef() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.legalName,
  };
}

export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.legalName,
    legalName: SITE.legalName,
    alternateName: SITE.brand,
    description: SITE.description50,
    url: `${SITE.domain}/`,
    logo: `${SITE.domain}/assets/img/logo.svg`,
    telephone: SITE.phoneE164,
    email: SITE.email,
    foundingDate: SITE.founded,
    founder: { '@type': 'Person', '@id': PERSON_ID, name: SITE.principal },
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    areaServed: { '@type': 'Country', name: 'United States' },
    sameAs: [...SITE.sameAs],
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.brand,
    url: `${SITE.domain}/`,
    inLanguage: 'en-US',
    publisher: orgRef(),
  };
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.principal,
    honorificSuffix: SITE.principalCreds,
    jobTitle: 'Vocational Expert and Life Care Planner',
    worksFor: orgRef(),
    url: `${SITE.domain}/experts/jason-purinton/`,
    telephone: SITE.phoneE164,
    email: SITE.email,
    hasCredential: [
      'Licensed Professional Counselor (LPC)',
      'Certified Rehabilitation Counselor (CRC)',
      'Certified Vocational Evaluator (CVE)',
      'Certified Life Care Planner (CLCP)',
      'Fellow, American Board of Vocational Experts (ABVE/F)',
      'International Psychometric Evaluator, Certified (IPEC)',
    ].map((name) => ({
      '@type': 'EducationalOccupationalCredential',
      name,
    })),
    memberOf: [
      {
        '@type': 'OrganizationRole',
        roleName: 'President, Board of Directors',
        memberOf: {
          '@type': 'Organization',
          name: 'American Rehabilitation Economics Association',
          alternateName: 'AREA',
        },
      },
      {
        '@type': 'OrganizationRole',
        roleName: 'Board of Directors and Fellow',
        memberOf: {
          '@type': 'Organization',
          name: 'American Board of Vocational Experts',
          alternateName: 'ABVE',
        },
      },
      {
        '@type': 'OrganizationRole',
        roleName: 'Board of Directors, Forensic Section Representative',
        startDate: '2022',
        endDate: '2024',
        memberOf: {
          '@type': 'Organization',
          name: 'International Association of Rehabilitation Professionals',
          alternateName: 'IARP',
        },
      },
    ],
    sameAs: ['https://www.linkedin.com/in/pa-expert'],
  };
}

export function serviceJsonLd(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    serviceType: input.name,
    description: input.description,
    url: SITE.domain + input.path,
    provider: orgRef(),
    areaServed: { '@type': 'Country', name: 'United States' },
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  reviewer?: string;
}) {
  const url = SITE.domain + input.path;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', '@id': PERSON_ID, name: SITE.principal },
    publisher: orgRef(),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    ...(input.reviewer
      ? { reviewedBy: { '@type': 'Person', name: input.reviewer } }
      : {}),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: SITE.domain + crumb.path,
    })),
  };
}

export function contactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${SITE.brand}`,
    url: `${SITE.domain}/contact/`,
    mainEntity: {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: SITE.legalName,
      telephone: SITE.phoneE164,
      email: SITE.email,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: SITE.phoneE164,
        email: SITE.email,
        contactType: 'case referrals and general inquiries',
        areaServed: 'US',
        availableLanguage: 'English',
      },
    },
  };
}
