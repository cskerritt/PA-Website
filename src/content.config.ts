import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faq = z.object({ q: z.string(), a: z.string() });

/**
 * The strategy plan's 13-point page template, enforced at build time.
 * Points 4 (methodology), 7 (engagement process), and 8 (role boundaries)
 * live in the markdown body; the structured frontmatter renders the rest.
 */
const templatePage = z.object({
  title: z.string().max(65), // <title> tag; BaseLayout appends " | Purinton Analytics"
  metaDescription: z.string().min(70).max(165),
  h1: z.string(),
  directAnswer: z.string().min(200).max(900), // ~50-100 words
  questionsAddressed: z.array(z.string()).min(3),
  appropriateUses: z.array(z.string()).min(2),
  inappropriateUses: z.array(z.string()).min(1), // role-boundary honesty
  recordsRequired: z.array(z.string()).min(3),
  deliverables: z.array(z.string()).min(2),
  faqs: z.array(faq).min(3),
  author: z.string().default('Jason C. Purinton'),
  reviewer: z.string().default('Jason C. Purinton'),
  datePublished: z.string(),
  dateModified: z.string(),
  citations: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  relatedServices: z.array(z.string()).default([]),
});

const mk = (base: string) =>
  defineCollection({ loader: glob({ pattern: '**/*.md', base }), schema: templatePage });

/**
 * Shared fields for every tier of location page. Content entry ids equal the
 * URL path under /locations/ (e.g. missouri/kansas-city), and the tier field
 * is the authoritative discriminator for routing and link blocks.
 */
const locBase = {
  title: z.string(),
  metaDescription: z.string().min(70).max(165),
  h1: z.string(),
};

export const collections = {
  services: mk('./src/content/services'),
  matters: mk('./src/content/matters'),
  resources: mk('./src/content/resources'),
  locations: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/locations' }),
    schema: z.discriminatedUnion('tier', [
      z.object({ tier: z.literal('hub'), ...locBase }),
      z.object({ tier: z.literal('state'), ...locBase, state: z.string(), stateSlug: z.string() }),
      z.object({
        tier: z.literal('metro'),
        ...locBase,
        state: z.string(),
        stateSlug: z.string(),
        metro: z.string(),
        metroSlug: z.string(),
        counties: z.array(z.string()).min(1),
        city: z.string().optional(), // kept for the office panel + breadcrumbs
      }),
      z.object({
        tier: z.literal('town'),
        ...locBase,
        state: z.string(),
        stateSlug: z.string(),
        metro: z.string(),
        metroSlug: z.string(),
        metroStateSlug: z.string(),
        town: z.string(),
        townSlug: z.string(),
        county: z.string(),
      }),
    ]),
  }),
};
