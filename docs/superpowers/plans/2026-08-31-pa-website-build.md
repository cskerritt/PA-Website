# PA-Website National Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Purinton Analytics national attorney-referral website (~38 substantive pages) as a static Astro 5 site with conflict-check intake, full JSON-LD, and AI-crawler configuration, deployable to Railway via Docker+Caddy.

**Architecture:** Astro 5 static output. A single `src/config/site.ts` entity record feeds all visible content and JSON-LD. Content collections (`services`, `matters`, `resources`, `locations`) enforce the strategy plan's 13-point page template via zod schema. A vitest suite crawls `dist/` to enforce site-wide invariants.

**Tech Stack:** Astro 5, TypeScript, vitest, node-html-parser (dev), Caddy (serve), Docker, Railway. No client framework; vanilla JS for nav + form only.

**Spec:** `docs/superpowers/specs/2026-08-31-pa-website-design.md` — read it first; every constraint below derives from it.

## Global Constraints

- Canonical domain: `https://purintonanalytics.com` — ONLY via `SITE.domain`; never hardcode in pages.
- Objective tone; plaintiff-and-defense neutrality statement on: homepage, every service page, every matter page, expert profile, referral form, national coverage hub. Exact sentence lives in `SITE.neutralityStatement`.
- **No em dashes anywhere in rendered prose** (hyphens only). Enforced by test.
- No credential logo badge strips; text credential lists only.
- No fabricated facts: no street addresses (all 4 offices are `address: null`, "by appointment"), no reviews/ratings schema, no LocalBusiness schema, no "231 S. Bemiston" ever.
- Stats allowed but only the ones in `SITE.stats` (gated by LAUNCH-CHECKLIST).
- Economic analyses are performed and signed by **independent economist partners**; never imply Jason Purinton issues economist opinions.
- Primary CTA is "Request a Conflict Check" — never "Schedule a Consultation".
- No `type="file"` inputs on any public form.
- JSON-LD must be generated from the same data object that renders visible content.
- Node 22 (`~/.local/node/node-v22.22.0-darwin-arm64/bin` if system node is 25 — see reference_node25_npm_bug).
- Docker build + run + smoke test locally before any push to main.
- Do NOT deploy to Railway or touch DNS in this plan; deploy is a separate user-gated step.

---

### Task 1: Scaffold + entity record + base layout

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.dockerignore`
- Create: `src/config/site.ts`
- Create: `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`
- Create: `src/styles/global.css`, `public/assets/` (brand files copied from PA-Site)
- Create: `src/pages/index.astro` (placeholder shell only; real homepage is Task 6)
- Test: `tests/build.test.ts`, `tests/helpers.ts`

**Interfaces:**
- Produces: `SITE` object (shape below) imported as `import { SITE } from '../config/site'`; `BaseLayout` props `{ title: string; description: string; path: string; jsonld?: object[] }`; test helpers `distFile(path: string): string` (reads `dist/<path>/index.html` or `dist/<path>` if it ends in a file extension) and `parseDist(path: string): HTMLElement` (node-html-parser root).

- [ ] **Step 1: Init project**

```bash
cd "/Users/chrisskerritt/Documents/New project/PA-Website"
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
npm install
npm install -D vitest node-html-parser
```

Set `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://purintonanalytics.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
```

Add scripts to package.json: `"build": "astro build"`, `"dev": "astro dev"`, `"test": "vitest run"`.

- [ ] **Step 2: Copy brand assets**

```bash
mkdir -p public/assets/img
cp "../PA-Site/assets/img/logo.svg" "../PA-Site/assets/img/logo-light.svg" \
   "../PA-Site/assets/img/favicon-32.png" "../PA-Site/assets/img/apple-touch-icon.png" \
   "../PA-Site/assets/img/og-default.png" public/assets/img/
cp "../PA-Site/favicon.svg" public/favicon.svg
```

- [ ] **Step 3: Write `src/config/site.ts`** (the controlled entity record — exact values, from spec)

```ts
export const SITE = {
  legalName: 'Purinton Analytics, LLC',
  brand: 'Purinton Analytics',
  domain: 'https://purintonanalytics.com',
  tagline: 'Nationwide Vocational Expert, Life Care Planning, and Economic Damages Services',
  principal: 'Jason C. Purinton',
  principalCreds: 'LPC, CRC, CVE, CLCP, ABVE/F, IPEC',
  phoneDisplay: '(877) 882-9778',
  phoneE164: '+18778829778',
  email: 'jason@pa-expert.com', // LAUNCH-CHECKLIST item 3: may change with domain
  city: 'Kansas City', region: 'MO', country: 'US', founded: '2018',
  neutralityStatement:
    'Purinton Analytics accepts engagements from both plaintiff and defense counsel and provides objective, methodology-driven opinions regardless of retaining party.',
  description50:
    'Purinton Analytics is a national forensic damages and rehabilitation consulting firm providing coordinated vocational evaluation, life care planning, and forensic economic analysis for plaintiff and defense counsel in litigation across the United States.',
  description150: /* 150-word version covering: national scope, three disciplines with role boundaries, independent economist partners, conflict-check process, plaintiff+defense neutrality, ABVE/AREA leadership, 3,000+ evaluations, remote and in-person availability. Write it in Task 1; keep under 160 words. */ '',
  stats: [
    { value: '3,000+', label: 'disability-related vocational evaluations' },   // gated
    { value: '50', label: 'states available for engagement' },
    { value: '3', label: 'coordinated forensic disciplines' },
    { value: '2018', label: 'serving litigators since' },
  ],
  sameAs: [
    'https://www.linkedin.com/in/pa-expert',
    'https://www.linkedin.com/company/purintonanalytics',
    'https://www.facebook.com/Purinton.Analytics',
    'https://x.com/PurintonExpert',
  ],
  web3formsKey: '9a52d3b9-a7cb-4f4f-8479-f0d330f3a6ce',
  robots: { allowGPTBot: false, allowClaudeBot: false },
  offices: [
    { slug: 'kansas-city', city: 'Kansas City', region: 'MO', regionFull: 'Missouri', primary: true },
    { slug: 'st-louis', city: 'St. Louis', region: 'MO', regionFull: 'Missouri' },
    { slug: 'denver', city: 'Denver', region: 'CO', regionFull: 'Colorado' },
    { slug: 'chicago', city: 'Chicago', region: 'IL', regionFull: 'Illinois' },
  ], // all by appointment; NO street addresses (accuracy guardrail)
} as const;
```

Write the actual `description150` prose (objective tone, no em dashes).

- [ ] **Step 4: BaseLayout + Header + Footer + global.css**

BaseLayout: html/head with charset, viewport, `<title>{title} | Purinton Analytics</title>` (home page passes full title without suffix), meta description, `<link rel="canonical" href={SITE.domain + path}>`, OG tags (og:image = `${SITE.domain}/assets/img/og-default.png`), favicons, one `<script type="application/ld+json">` per entry in `jsonld`, Header, `<slot/>`, Footer.

Header: navy bar, `logo.svg`, nav links Home / Services / Matters / Experts / National Coverage / Resources / About / Contact + prominent button "Refer a Case" → `/refer-a-case/`; mobile hamburger with vanilla JS toggle (button has `aria-expanded`). Footer: `logo-light.svg`, phone, email, nav columns, neutrality statement, policy links, `© {year} Purinton Analytics, LLC`.

global.css design tokens (from PA-Site brand): `--navy: #012262; --orange: #E87722; --teal: #0E7C7B; --bg: #FAFAF8; --ink: #1a2333;` System font stack or a single Google-free self-hosted stack (system-ui) - no external font dependency. Visible focus states, `img { height: auto; max-width: 100%; }` (PA-Site image gotcha), reduced-motion media query, print stylesheet hook `@media print`.

- [ ] **Step 5: Placeholder index page** using BaseLayout with H1 = SITE.tagline.

- [ ] **Step 6: Write failing build test** `tests/build.test.ts` + `tests/helpers.ts`

```ts
// tests/helpers.ts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
const DIST = join(process.cwd(), 'dist');
export function distFile(path: string): string {
  const p = /\.[a-z]+$/.test(path) ? join(DIST, path) : join(DIST, path, 'index.html');
  if (!existsSync(p)) throw new Error(`missing dist file for ${path}`);
  return readFileSync(p, 'utf8');
}
export function parseDist(path: string): HTMLElement { return parse(distFile(path)); }
export function jsonld(path: string): any[] {
  return parseDist(path).querySelectorAll('script[type="application/ld+json"]')
    .map(s => JSON.parse(s.text));
}
```

```ts
// tests/build.test.ts
import { describe, it, expect } from 'vitest';
import { parseDist } from './helpers';
describe('build output', () => {
  it('homepage builds with canonical, single H1, meta description', () => {
    const doc = parseDist('');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://purintonanalytics.com/');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length)
      .toBeGreaterThan(50);
  });
});
```

- [ ] **Step 7: Run** `npm run build && npm test` — expect PASS (build test runs against dist; run build first, always).

- [ ] **Step 8: Commit** `git add -A && git commit -m "feat: scaffold Astro site, entity record, base layout, brand assets"`

---

### Task 2: JSON-LD generator module

**Files:**
- Create: `src/lib/jsonld.ts`
- Test: `tests/jsonld.test.ts` (unit, no dist needed)

**Interfaces:**
- Produces: `orgJsonLd()`, `webSiteJsonLd()`, `personJsonLd()`, `serviceJsonLd(input: { name: string; description: string; path: string })`, `articleJsonLd(input: { headline: string; description: string; path: string; datePublished: string; dateModified: string; reviewer?: string })`, `faqJsonLd(faqs: { q: string; a: string }[])`, `breadcrumbJsonLd(crumbs: { name: string; path: string }[])`, `contactPageJsonLd()`. All return plain objects for BaseLayout's `jsonld` prop.

- [ ] **Step 1: Write failing unit tests** — for each function assert `@context`, `@type`, and that name/phone/sameAs come from SITE:

```ts
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
```

- [ ] **Step 2: Run** `npm test` — expect FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/jsonld.ts`** — Organization (name, legalName, url, telephone, email, foundingDate, sameAs, address as city/region only via `PostalAddress` with `addressLocality`/`addressRegion` — no street), WebSite (+potentialAction none), Person (jobTitle 'Vocational Expert and Life Care Planner', honorific credentials as `hasCredential` EducationalOccupationalCredential entries for LPC/CRC/CVE/CLCP/ABVE-F/IPEC, `memberOf`/affiliations: AREA President Board of Directors, ABVE Board of Directors and Fellow, IARP Forensic Section Rep 2022-2024, sameAs LinkedIn), Service (provider = Organization ref, areaServed `{ '@type': 'Country', name: 'United States' }`), Article (author Person, reviewer Person when given, dates), FAQPage, BreadcrumbList (absolute URLs `SITE.domain + path`), ContactPage.

- [ ] **Step 4: Run** `npm test` — PASS. **Step 5: Commit** `feat: JSON-LD generators from entity record`.

---

### Task 3: Content collections + shared page components

**Files:**
- Create: `src/content.config.ts`
- Create: `src/components/{ProofBand,NeutralityStatement,ProcessSteps,CTABand,FAQBlock,Breadcrumbs,DirectAnswer}.astro`
- Create: `src/layouts/TemplatePageLayout.astro` (renders the 13-point template for services/matters/resources)
- Test: `tests/components.test.ts` (dist-based, uses one seed service page built in this task)
- Create: `src/content/services/vocational-expert-witness.md` (exemplar — full content)
- Create: `src/pages/services/[slug].astro`, `src/pages/services/index.astro`

**Interfaces:**
- Consumes: `SITE`, jsonld functions.
- Produces: collection schema `templatePage` (fields below) used by all four collections; `TemplatePageLayout` props `{ entry: CollectionEntry, section: 'services'|'matters'|'resources', jsonldExtra?: object[] }`; components used by every later page task. `CTABand` renders primary link "Request a Conflict Check" → `/refer-a-case/`, secondary "Request CVs and Fee Information" → `/contact/#cv-fee`, and phone strip "Imminent disclosure, deposition, or trial deadline? Call (877) 882-9778".

- [ ] **Step 1: `src/content.config.ts`** with zod schema enforcing the 13-point template:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const faq = z.object({ q: z.string(), a: z.string() });
const templatePage = z.object({
  title: z.string().max(65),           // <title> tag
  metaDescription: z.string().min(70).max(165),
  h1: z.string(),
  directAnswer: z.string().min(200).max(900),   // ~50-100 words
  questionsAddressed: z.array(z.string()).min(3),
  appropriateUses: z.array(z.string()).min(2),
  inappropriateUses: z.array(z.string()).min(1), // role-boundary honesty
  recordsRequired: z.array(z.string()).min(3),
  deliverables: z.array(z.string()).min(2),
  faqs: z.array(faq).min(3),
  author: z.string().default('Jason C. Purinton'),
  reviewer: z.string().default('Jason C. Purinton'),
  datePublished: z.string(), dateModified: z.string(),
  citations: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  relatedServices: z.array(z.string()).default([]),
});
const mk = (base: string) => defineCollection({
  loader: glob({ pattern: '**/*.md', base }), schema: templatePage });
export const collections = {
  services: mk('./src/content/services'),
  matters: mk('./src/content/matters'),
  resources: mk('./src/content/resources'),
  locations: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/locations' }),
    schema: z.object({ title: z.string(), metaDescription: z.string(), h1: z.string(),
      city: z.string().optional(), regionFull: z.string().optional() }),
  }),
};
```

Markdown body = methodology narrative + typical engagement process + role-boundaries prose (points 4, 7, 8 of the template); the structured frontmatter renders the rest.

- [ ] **Step 2: TemplatePageLayout** — renders in order: Breadcrumbs, H1, DirectAnswer (styled lead box), NeutralityStatement, "Questions this evaluation addresses" list, appropriate/inappropriate uses two-column, markdown body (methodology/process/boundaries), records-required checklist, deliverables, FAQBlock (visible + `faqJsonLd`), author/reviewer + published/updated dates, citations list (real links), CTABand. JSON-LD: breadcrumb + faq + (service|article per section) via props.

- [ ] **Step 3: Exemplar content** `vocational-expert-witness.md` — full real content, objective tone, ~1,200+ words body. directAnswer defines what a vocational expert witness does nationally (employability, placeability, earning capacity, transferable skills, labor market access) for plaintiff and defense. Citations: BLS OEWS (https://www.bls.gov/oes/), O*NET (https://www.onetonline.org/), ABVE (https://abve.net/). Route `src/pages/services/[slug].astro` via `getStaticPaths` over the collection; `/services/` index lists all 7 (cards; only exemplar exists yet — index reads the collection so it grows automatically).

- [ ] **Step 4: Failing dist test** in `tests/components.test.ts`: `/services/vocational-expert-witness/` has exactly one H1; contains SITE.neutralityStatement text; contains "Request a Conflict Check"; has FAQPage + BreadcrumbList + Service JSON-LD types; page prose contains no em dash (`—`). Run before implementing route → FAIL; implement → `npm run build && npm test` PASS.

- [ ] **Step 5: Commit** `feat: content collections, 13-point template layout, exemplar service page`.

---

### Task 4: Remaining 6 service pages

**Files:**
- Create: `src/content/services/{life-care-planning,medical-cost-projection,forensic-economic-damages,rebuttal-peer-review,expert-testimony-litigation-consulting,coordinated-damages-assessment}.md`
- Test: extend `tests/components.test.ts` with a loop over all 7 service slugs asserting the Task 3 invariants.

**Interfaces:** Consumes templatePage schema + TemplatePageLayout exactly as Task 3.

- [ ] **Step 1: Write the 6 pages.** Per-page requirements (each ~1,000+ word body, distinct content, no copy reuse):

| Slug | Title tag | H1 | Distinct angle / must-cover |
|---|---|---|---|
| life-care-planning | Life Care Planning Services Nationwide | Life Care Planning for Catastrophic Injury Litigation | CLCP methodology, medical foundation requirement, collaboration with treating physicians, future care categories; cite IALCP standards, CDC |
| medical-cost-projection | Medical Cost Projection Services | Medical Cost Projections for Litigation | Distinct from full LCP (scope, when each is appropriate — inappropriateUses must say when an MCP is NOT sufficient); geographic cost data sources |
| forensic-economic-damages | Forensic Economic Damages Analysis | Forensic Economic Damages Analysis | **MUST state analyses are performed and signed by independent economist partners coordinated by the firm**; present value, worklife expectancy, household services; cite BLS, Skoog-Ciecka worklife tables |
| rebuttal-peer-review | Rebuttal and Peer Review Services | Rebuttal and Peer Review of Opposing Expert Reports | Methodology-critique framework (foundation, data vintage, math, role boundaries); works for plaintiff AND defense; rush availability |
| expert-testimony-litigation-consulting | Expert Testimony and Litigation Consulting | Expert Testimony and Litigation Consulting | Deposition/trial experience, remote testimony, consulting-vs-testifying roles and discoverability boundary (descriptive, not legal advice) |
| coordinated-damages-assessment | Coordinated Damages Assessment | One Coordinated Engagement. Clearly Separated Expert Roles. | The flagship differentiator: how VE + LCP + independent economist coordinate while preserving separate opinions; 4-step engagement process; catastrophic/med-mal focus |

- [ ] **Step 2:** `npm run build && npm test` (loop test now covers 7 slugs) — PASS. **Step 3: Commit** `feat: complete service page cluster (7 pages)`.

---

### Task 5: Matter pages (10)

**Files:**
- Create: `src/pages/matters/[slug].astro`, `src/pages/matters/index.astro`
- Create: `src/content/matters/{personal-injury,medical-malpractice,wrongful-death,pediatric-birth-injury,employment-litigation,family-law,workers-compensation,erisa-long-term-disability,product-liability-mass-tort,veterans-tdiu}.md`
- Test: extend loop test to matter slugs (same invariants; JSON-LD = Article not Service).

**Interfaces:** Consumes TemplatePageLayout with `section: 'matters'`; `relatedServices` frontmatter links each matter to 2-3 service slugs (rendered as "Relevant services" cards).

- [ ] **Step 1: Route + index** (mirror Task 3's service route).
- [ ] **Step 2: Write the 10 pages.** Each connects legal problem → which experts and analyses apply (~800+ word body). Must-covers: personal-injury (earning capacity, household services); medical-malpractice (coordinated LCP+MCP+economics for catastrophic outcomes); wrongful-death (economic loss to survivors, worklife); pediatric-birth-injury (pediatric earning capacity without work history — methodology honesty); employment-litigation (mitigation, job-search reasonableness, back/front pay support role); family-law (imputed income, earning capacity of a non-working spouse); workers-compensation (state-system context, descriptive only); erisa-long-term-disability (own-occ vs any-occ employability); product-liability-mass-tort (scalable evaluation protocols); veterans-tdiu (TDIU employability standard, VA context). Every page: plaintiff-and-defense statement, distinct FAQs, real citations.
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: matter page cluster (10 pages)`.

---

### Task 6: Homepage

**Files:**
- Modify: `src/pages/index.astro` (replace placeholder)
- Test: `tests/homepage.test.ts`

**Interfaces:** Consumes ProofBand, NeutralityStatement, ProcessSteps, CTABand, ExpertCard (create in this task: photo-less card with name, creds, leadership lines, link to profile), collections (services, matters for card grids).

- [ ] **Step 1: Failing test** — `/` contains: H1 exactly `Nationwide Vocational Expert, Life Care Planning, and Economic Damages Services`; the hero paragraph from the strategy plan (assert substring "objective litigation support for plaintiff and defense counsel"); links to `/refer-a-case/` and `/contact/#cv-fee`; phone number; all 7 service links; ≥6 matter links; Organization + WebSite JSON-LD; no em dashes.
- [ ] **Step 2: Implement** the plan §4 12-section sequence: (1) hero + CTAs + urgent phone strip, (2) ProofBand from SITE.stats, (3) three principal disciplines (VE / LCP / economics-via-partners cards), (4) coordinated damages assessment explainer + link, (5) NeutralityStatement band, (6) matter-type card grid, (7) ProcessSteps: conflict check & scope → expert selection & records request → evaluation, analysis, report → deposition, mediation, trial support, (8) ExpertCard for Jason, (9) national coverage strip + link, (10) featured resources (3 checklists), (11) 4-6 referral FAQs (visible + FAQPage JSON-LD), (12) final CTABand. Hero copy verbatim from spec/plan.
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: homepage with national positioning sequence`.

---

### Task 7: Expert profile + index

**Files:**
- Create: `src/pages/experts/index.astro`, `src/pages/experts/jason-purinton.astro`
- Test: `tests/experts.test.ts`

**Interfaces:** Consumes `personJsonLd()`, NeutralityStatement, CTABand.

- [ ] **Step 1: Failing test** — `/experts/jason-purinton/` has Person JSON-LD whose `name` is `Jason C. Purinton`; visible text includes every credential token (LPC, CRC, CVE, CLCP, ABVE/F, IPEC), "President" + "American Rehabilitation Economics Association", "Board of Directors" + ABVE; `/experts/` includes the phrase "independent economist" and does NOT contain any `<img>` badge strip (assert no element with class matching /badge|logo-strip/). Both pages carry neutrality statement.
- [ ] **Step 2: Implement.** Profile: bio (from PA-Site about/credentials content, rewritten for national positioning), credentials sidebar (text list), leadership, areas of evaluation, testimony availability (nationwide, remote + in person), publications/presentations section (only items verifiable from PA-Site content; omit section if none), CTA. Index: Jason's card + a clearly-worded section "Forensic Economics Partners" explaining independent economists perform and sign economic analyses, selected per venue and case needs; invite CV requests via contact.
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: expert profile and roster with economist-partner boundaries`.

---

### Task 8: Locations (nationwide hub + 4 metros)

**Files:**
- Create: `src/content/locations/{nationwide,kansas-city,st-louis,denver,chicago}.md`
- Create: `src/pages/locations/[slug].astro`, `src/pages/locations/index.astro` (redirect-style index that renders hub links; canonical hub is `/locations/nationwide/`)
- Test: `tests/locations.test.ts`

**Interfaces:** Consumes SITE.offices, CTABand, NeutralityStatement.

- [ ] **Step 1: Failing test** — `/locations/nationwide/` contains neutrality statement, "remote", "deposition", "trial", and NO LocalBusiness JSON-LD anywhere in `/locations/**`; each metro page contains "by appointment" and no street address pattern (assert no regex `/\d{2,5}\s+[A-Z][a-z]+.*(St|Ave|Blvd|Suite)/`).
- [ ] **Step 2: Content.** Nationwide hub (plan §9): states-served narrative, federal + state matters, remote and in-person evaluation options, travel/depo/trial availability, Canadian coordination sentence, local labor-market research methodology (BLS OEWS by MSA, O*NET, state workforce data), geographic medical-cost research, licensing note. Metro pages: honest "available by appointment" framing, courts served narrative (adapted from PA-Site OFFICES blurbs), links to services + refer-a-case. No thin-page duplication - each metro ≥300 distinct words.
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: national coverage hub and metro pages`.

---

### Task 9: Resources (9 pages) + print stylesheet

**Files:**
- Create: `src/pages/resources/[slug].astro`, `src/pages/resources/index.astro`
- Create: `src/content/resources/{vocational-evaluation-records-checklist,life-care-plan-records-checklist,economic-loss-records-checklist,expert-disclosure-deadline-worksheet,vocational-expert-vs-economist-vs-life-care-planner,rebuttal-review-checklist,catastrophic-damages-team-referral-guide,faq,glossary}.md`
- Modify: `src/styles/global.css` (print rules: hide header/footer/CTA, black-on-white, checklist checkboxes render as `☐` via CSS counter or literal)
- Test: extend loop test to resource slugs (Article JSON-LD, author/reviewer/date visible, print-button present).

**Interfaces:** Consumes TemplatePageLayout (`section: 'resources'`); resource pages add a "Print or save this checklist" button (`window.print()`).

- [ ] **Step 1: Route + index** (cards grouped: Checklists / Guides / Reference).
- [ ] **Step 2: Content.** Checklists = comprehensive itemized record lists (vocational: education, employment/wage records, SSA file, medical restrictions, prior evals...; LCP: medical records by specialty, medications, equipment, home eval, physician foundation...; economic-loss: tax returns, W-2s, benefits, household composition...). Worksheet = disclosure-deadline planning timeline table (works backward from trial date). VE-vs-economist-vs-LCP guide = role boundary matrix + who-signs-what. Rebuttal checklist = methodology critique points. Catastrophic guide = when to engage the coordinated team, sequencing. FAQ = 12+ referral questions (fees process, conflicts, timing, remote, plaintiff/defense mix, records). Glossary = 25+ terms (employability, placeability, earning capacity, worklife expectancy, present value, TSA, LMS, mitigation, MMI...). All with real citations where factual claims are made.
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: attorney resource library with print-friendly checklists`.

---

### Task 10: Referral funnel + contact + policies + 404

**Files:**
- Create: `src/pages/refer-a-case/index.astro`, `src/pages/refer-a-case/thanks.astro`, `src/pages/contact.astro`
- Create: `src/pages/{privacy,accessibility,disclaimer}.astro`, `src/pages/404.astro`
- Create: `public/scripts/form.js` (vanilla; validation + timestamp token + fetch submit)
- Create: `src/pages/about.astro`
- Test: `tests/forms.test.ts`

**Interfaces:** Consumes SITE.web3formsKey. Form field `name` attributes (exact, consumed by Web3Forms email): `attorney_name, firm, email, phone, side, service_requested, case_type, jurisdiction_venue, caption_parties, disclosure_deadline, depo_trial_date, summary, referral_source, urgency`.

- [ ] **Step 1: Failing test** — `/refer-a-case/` contains: all 14 field names above; `side` is a `<select>` with options Plaintiff/Defense/Insurer/Employer/Neutral; NO `type="file"` input; visible warning matching /do not (submit|include).*(medical records|confidential)/i; honeypot input named `contact_preference` with `tabindex="-1"` and `autocomplete="off"` inside an `aria-hidden` off-screen wrapper; a hidden `form_started` timestamp input. `/contact/` has an element `id="cv-fee"`. All pages exist; 404 built.
- [ ] **Step 2: Implement referral form.** Accessible labels + `aria-describedby` error slots; required: attorney_name, firm, email, side, service_requested, case_type, jurisdiction_venue, summary. `form.js`: on load set `form_started = Date.now()`; on submit block if honeypot filled OR elapsed < 3s; build Web3Forms payload with `subject = '[Conflict Check] ' + side + ' · ' + case_type + ' · ' + jurisdiction_venue + (disclosure_deadline ? ' · deadline ' + disclosure_deadline : '')`, `access_key = SITE.web3formsKey`, `botcheck` unset; POST `https://api.web3forms.com/submit`; success → `location.href = '/refer-a-case/thanks/'`; failure → visible error with phone fallback. Thanks page: response expectation ("during business hours we typically respond the same day"), urgent phone, what happens next (conflict review → secure upload link → records checklist).
- [ ] **Step 3: Contact page** — general inquiry form (name, email, message) + `#cv-fee` mini-form (name, email, firm; subject `[CV and Fee Request]`), both Web3Forms. Distinct-path links: rebuttal/rush → refer-a-case preselecting urgency via `?urgency=rush` (form.js reads query param), speaking/publications → mailto.
- [ ] **Step 4: About + policies.** About: firm history (founded 2018), professional standards, neutrality, QC process (every report peer-reviewed before delivery — only if true; else describe actual QC), link to expert. Privacy: no-sensitive-data instruction mirrored. Accessibility: state actual conformance work performed this build (keyboard nav, labels, contrast, focus states, reduced motion) targeting WCAG 2.2 AA; no untested claims. Disclaimer: no legal advice, no attorney-client relationship, results vary. 404: branded, links home/services/refer.
- [ ] **Step 5:** build + test PASS. **Step 6: Commit** `feat: conflict-check referral funnel, contact, policies`.

---

### Task 11: SEO/AI artifacts (robots, sitemap, llms.txt, IndexNow)

**Files:**
- Create: `src/pages/robots.txt.ts`, `src/pages/sitemap.xml.ts`, `src/pages/llms.txt.ts`
- Create: `public/` IndexNow key file (generate key: 32-hex, store as `SITE.indexNowKey`, file `public/<key>.txt` containing the key)
- Modify: `src/config/site.ts` (add `indexNowKey`)
- Test: `tests/seo-artifacts.test.ts`

**Interfaces:** Endpoints use Astro static file endpoints (`export const GET: APIRoute`). Sitemap enumerates every built route with `lastmod` from content `dateModified` (fallback: build date); import collections via `getCollection` inside the endpoint.

- [ ] **Step 1: Failing test** — `dist/robots.txt`: contains `User-agent: OAI-SearchBot\nAllow: /`, same for Claude-SearchBot, Claude-User, PerplexityBot, Googlebot, Bingbot; contains `User-agent: GPTBot\nDisallow: /` and `User-agent: ClaudeBot\nDisallow: /` (given flags false); `Sitemap: https://purintonanalytics.com/sitemap.xml`. `dist/sitemap.xml`: parses as XML, ≥38 `<url>` entries, every `<loc>` starts with SITE.domain and maps to an existing dist file (use helpers). `dist/llms.txt` mentions firm name, Jason, services list, refer-a-case URL. IndexNow key file exists and content equals filename stem.
- [ ] **Step 2: Implement.** robots.txt.ts builds from a `crawlers` array + flags. sitemap.xml.ts collects: static page list (hand-maintained array of the fixed routes) + collection entries; test cross-checks against dist so a forgotten route fails loudly. llms.txt: markdown-ish directory per spec (firm, expert, services with URLs, matters, resources, policies, contact/refer URLs).
- [ ] **Step 3:** build + test PASS. **Step 4: Commit** `feat: robots policy, sitemap, llms.txt, IndexNow key`.

---

### Task 12: Site-wide invariant suite

**Files:**
- Create: `tests/sitewide.test.ts`

**Interfaces:** Consumes helpers; walks every `dist/**/index.html`.

- [ ] **Step 1: Implement tests (this task is all test code):**

```ts
// walk dist for all html files
import { globSync } from 'node:fs'; // use fs.globSync (Node 22+) or a tiny walker
```

Assertions across every HTML page: (1) exactly one `<h1>`; (2) `<title>` unique site-wide and ≤ 70 chars; (3) meta description present + unique; (4) canonical present, starts with SITE.domain, ends with `/`; (5) no em dash `—` in rendered text content (exempt `<script>` bodies); (6) banned strings absent: `231 S. Bemiston`, `Schedule a Consultation`, `LocalBusiness`, `aggregateRating`; (7) every internal `href` resolves to a dist file or is `tel:`/`mailto:`/`#`/external; (8) every `<img src>` resolves to a file in dist; (9) all JSON-LD blocks `JSON.parse` cleanly; (10) neutrality statement present on: `/`, all `/services/*`, all `/matters/*`, `/experts/jason-purinton/`, `/refer-a-case/`, `/locations/nationwide/`; (11) no `type="file"` anywhere; (12) every page links to `/refer-a-case/` (CTA reachability).

- [ ] **Step 2:** `npm run build && npm test` — fix every violation the suite surfaces (expect real catches: duplicate titles between index pages, em dashes in prose). PASS.
- [ ] **Step 3: Commit** `test: site-wide invariant suite`.

---

### Task 13: Docker + Caddy + docs + launch checklist

**Files:**
- Create: `Dockerfile`, `Caddyfile`, `railway.json`, `.dockerignore`
- Create: `LAUNCH-CHECKLIST.md`, `docs/MIGRATION.md`, `README.md`, `CLAUDE.md`

**Interfaces:** none downstream; this is the ship container.

- [ ] **Step 1: Dockerfile** (multi-stage, PA-Site pattern):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm test

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
```

Caddyfile: `:{$PORT}` site; root /srv; `encode gzip`; `try_files {path} {path}/index.html`; `handle_errors` → serve `/404.html` with 404 status; `Cache-Control: public, max-age=3600` for html, `max-age=31536000, immutable` for `/_astro/*` (hashed). railway.json: `{"build":{"builder":"DOCKERFILE"},"deploy":{"restartPolicyType":"ON_FAILURE"}}`.

- [ ] **Step 2: Local verification (required before push):**

```bash
docker build -t pa-website .
docker run -d -p 8090:8090 -e PORT=8090 --name pa-web pa-website
curl -fsS localhost:8090/ | grep -q "Nationwide Vocational Expert"
curl -fsS localhost:8090/services/coordinated-damages-assessment/ >/dev/null
curl -fsS localhost:8090/robots.txt | grep -q OAI-SearchBot
curl -s -o /dev/null -w '%{http_code}' localhost:8090/nope | grep -q 404
docker rm -f pa-web
```

- [ ] **Step 3: LAUNCH-CHECKLIST.md** — copy the 8 gated items verbatim from spec §Launch checklist (register domain FIRST; stats confirmation; email; office classifications; economist naming; robots policy; GSC/Bing/IndexNow/Change-of-Address; external profiles). **docs/MIGRATION.md** — old-URL inventory procedure: crawl live pa-expert.com sitemap + PA-Site sitemap.xml, map each URL to nearest new route, 301 table skeleton with the obvious mappings filled (`/about/`→`/about/`, `/services/*`→nearest service, `/practice-areas/*`→nearest matter, `/offices/*`→`/locations/*`, `/contact/`→`/contact/`), activation = at DNS cutover only. **README.md** — stack, commands, deploy notes. **CLAUDE.md** — content standards (neutrality, no em dashes, no fabricated facts, stats only from SITE.stats, economist-partner rule, CTA rule) + build/test/docker commands.
- [ ] **Step 4: Commit + push** `git add -A && git commit -m "feat: docker/caddy ship config, launch checklist, migration draft" && git push`.

---

## Self-Review (done 2026-08-31)

- Spec coverage: every spec section maps to a task (entity record→1, JSON-LD→2, template/collections→3, services→3-4, matters→5, homepage→6, experts→7, locations→8, resources→9, funnel/policies→10, SEO/AI→11, testing→12 (+ per-task tests), deploy/docs→13). State pages, GBP, redirects-activation intentionally out of scope per spec.
- No placeholders: content tasks specify per-page angle, length floors, and required assertions instead of "write content".
- Type consistency: `SITE` fields, jsonld signatures, helper names (`distFile`, `parseDist`, `jsonld`), and form field names are used identically across tasks.
