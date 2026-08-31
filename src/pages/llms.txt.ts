import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../config/site';

/** Presentation order for the service directory (unknown slugs sort after, alphabetically). */
const SERVICE_ORDER = [
  'vocational-expert-witness',
  'life-care-planning',
  'medical-cost-projection',
  'forensic-economic-damages',
  'rebuttal-peer-review',
  'expert-testimony-litigation-consulting',
  'coordinated-damages-assessment',
] as const;

type TemplateEntry =
  | CollectionEntry<'services'>
  | CollectionEntry<'matters'>
  | CollectionEntry<'resources'>;

function line(section: string, entry: { id: string; data: { title: string; metaDescription: string } }): string {
  return `- [${entry.data.title}](${SITE.domain}/${section}/${entry.id}/): ${entry.data.metaDescription}`;
}

function byId(a: TemplateEntry, b: TemplateEntry): number {
  return a.id.localeCompare(b.id);
}

export const GET: APIRoute = async () => {
  const services = (await getCollection('services')).sort((a, b) => {
    const ai = SERVICE_ORDER.indexOf(a.id as (typeof SERVICE_ORDER)[number]);
    const bi = SERVICE_ORDER.indexOf(b.id as (typeof SERVICE_ORDER)[number]);
    if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const matters = (await getCollection('matters')).sort(byId);
  const resources = (await getCollection('resources')).sort(byId);
  const locations = (await getCollection('locations')).sort((a, b) => a.id.localeCompare(b.id));

  const body = `# ${SITE.brand}

> ${SITE.description50}

${SITE.description150}

Principal: ${SITE.principal}, ${SITE.principalCreds}. Base of operations: ${SITE.city}, ${SITE.region}, with engagements accepted nationwide. Phone: ${SITE.phoneDisplay}. Email: ${SITE.email}. ${SITE.neutralityStatement}

## Experts

- [${SITE.principal}, ${SITE.principalCreds}](${SITE.domain}/experts/jason-purinton/): Vocational expert and life care planner; President, Board of Directors, American Rehabilitation Economics Association; Board of Directors and Fellow, American Board of Vocational Experts.
- [Expert roster and economist partners](${SITE.domain}/experts/): Forensic economic analyses are performed and signed by independent economist partners coordinated by the firm.

## Services

${services.map((entry) => line('services', entry)).join('\n')}

## Litigation matters served

${matters.map((entry) => line('matters', entry)).join('\n')}

## Attorney resources

${resources.map((entry) => line('resources', entry)).join('\n')}

## Coverage

- [Nationwide coverage](${SITE.domain}/locations/nationwide/): Remote and in-person evaluation, deposition, and trial availability in all 50 states.
${locations
  .filter((entry) => entry.id !== 'nationwide')
  .map((entry) => `- [${entry.data.title}](${SITE.domain}/locations/${entry.id}/): ${entry.data.metaDescription}`)
  .join('\n')}

## Referrals and contact

- [Refer a case (conflict check request)](${SITE.domain}/refer-a-case/): The engagement path for counsel; every engagement begins with a documented conflict check.
- [Contact and CV or fee schedule requests](${SITE.domain}/contact/)
- [About the firm](${SITE.domain}/about/)

## Policies

- [Privacy policy](${SITE.domain}/privacy/)
- [Accessibility statement](${SITE.domain}/accessibility/)
- [Disclaimer](${SITE.domain}/disclaimer/)
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
