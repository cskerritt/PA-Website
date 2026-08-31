# Purinton Analytics National Website — Design Spec

Date: 2026-08-31
Repo: `cskerritt/PA-Website` (this repo, currently empty)
Source strategy document: `~/Downloads/Purinton_Analytics_National_Market_AI_Visibility_Plan.docx` (Aug 30, 2026)
Fact/asset source: `~/Documents/New project/PA-Site` (June 2026 rebuild — CV-verified facts, brand assets, content standards)

## Goal

Build a new static website positioning Purinton Analytics as a **national forensic
damages and rehabilitation consulting firm** — coordinated vocational evaluation,
life care planning, and forensic economic analysis for plaintiff and defense
counsel — with an attorney conflict-check referral funnel and full search/AI
crawler visibility, per the strategy document.

## Decisions (approved 2026-08-31)

1. **Fresh build** in PA-Website. Harvest verified facts, logo/brand assets, and
   content standards from PA-Site. Do not carry over its 362-page wide/thin
   structure; the plan wants ~30-40 deep pages.
2. **Verified stats allowed** (e.g., 3,000+ disability-related vocational
   evaluations) — a deliberate departure from the June no-stats rule, following
   the plan's proof-section guidance. All displayed stats gated on Jason's
   confirmation before DNS cutover (see Launch Checklist).
3. **Canonical domain: `https://purintonanalytics.com`** — UNREGISTERED as of
   2026-08-31 (whois: no match). Must be registered immediately. Domain lives in
   one config constant; site works on a Railway URL until DNS.
4. **Intake = email only, no server.** Web3Forms endpoint (existing key
   `9a52d3b9-a7cb-4f4f-8479-f0d330f3a6ce`, public by design, swappable constant).
   No database, no submission storage, no file uploads.
5. **Stack: Astro 5, fully static output**, Dockerfile → Caddy → Railway.
6. **Expert roster: Jason Purinton only** at launch, plus explicit copy that
   forensic economic analyses are performed and signed by independent economist
   partners coordinated by the firm. Never imply Jason issues economist opinions.
7. **Brand: keep** navy/orange/teal palette + existing logo assets
   (`PA-Site/assets/img/`: logo.svg, logo-light.svg, favicons, og-default.png);
   design fresh layouts for the national positioning.
8. **Full launch set in one build** (~38 substantive pages + policies).

## Verified entity facts (from PA-Site, CV-verified June 2026)

- Legal name: **Purinton Analytics, LLC**; principal **Jason C. Purinton**
- Credentials: **LPC, CRC, CVE, CLCP, ABVE/F, IPEC** (also FVE, NCC, RN)
- Leadership: **President, Board of Directors — American Rehabilitation Economics
  Association (AREA)**; **Board of Directors & Fellow — ABVE**; IARP Board of
  Directors, Forensic Section Representative (2022-2024)
- Base: **Kansas City, MO** (NOT St. Louis; a fabricated 231 S. Bemiston St.
  Louis address existed in old drafts — never reintroduce it)
- Phone **(877) 882-9778** / +18778829778; email **jason@pa-expert.com** (email
  domain may change with the domain decision — config constant)
- Founded 2018. LinkedIn `/in/pa-expert`; company page
  `linkedin.com/company/purintonanalytics`; Facebook `Purinton.Analytics`;
  X `PurintonExpert`
- Offices: KC (home office), St. Louis, Denver, Chicago — **all "by appointment",
  no street addresses, address=None**. Accuracy guardrail: no LocalBusiness
  PostalAddress/geo schema without a real, verified staffed address.

## Architecture

- Astro 5, `output: 'static'`. No client JS framework; small vanilla JS for the
  form and mobile nav only.
- **`src/config/site.ts`** — the controlled entity record (plan §10): legal
  name, brand, canonical domain, phone, email, city/region, founded, sameAs
  URLs, 50-word and 150-word firm descriptions, verified stats, Web3Forms key,
  robots policy flags (`allowGPTBot`, `allowClaudeBot`, default false). Single
  source of truth for both visible content and JSON-LD.
- **Content collections** (`src/content/`): `services` (7), `matters` (10),
  `resources` (9), `locations` (5). Frontmatter schema enforces the plan's
  13-point page template fields: `directAnswer` (50-100 words), `questions`,
  `appropriateUses`, `inappropriateUses`, `methodology`, `recordsRequired`,
  `deliverables`, `process`, `roleBoundaries`, `faq`, `author`, `reviewer`,
  `datePublished`, `dateModified`, `citations`.
- **Layouts/components**: BaseLayout (head, canonical, OG, JSON-LD slot,
  header/footer), ServiceLayout, MatterLayout, ResourceLayout, plus components:
  Hero, ProofBand (stats), NeutralityStatement, ProcessSteps (4-step
  engagement), ExpertCard, CTABand (conflict check + CV/fee + urgent phone),
  FAQBlock (renders visible FAQ + FAQPage JSON-LD from the same data),
  Breadcrumbs (visible + BreadcrumbList JSON-LD from the same data).
- JSON-LD is always generated from the same data object that renders the
  visible content — schema and page can never drift.

## Page inventory (~38 substantive + policies)

| Section | Pages |
|---|---|
| Home | `/` — the plan §4 12-section sequence; H1 "Nationwide Vocational Expert, Life Care Planning, and Economic Damages Services"; hero copy per plan; CTAs: "Request a Conflict Check" (primary), "Request CVs and Fee Information" (secondary), urgent-deadline phone strip |
| Services | `/services/` index + `vocational-expert-witness`, `life-care-planning`, `medical-cost-projection`, `forensic-economic-damages`, `rebuttal-peer-review`, `expert-testimony-litigation-consulting`, `coordinated-damages-assessment` |
| Matters | `/matters/` index + `personal-injury`, `medical-malpractice`, `wrongful-death`, `pediatric-birth-injury`, `employment-litigation`, `family-law`, `workers-compensation`, `erisa-long-term-disability`, `product-liability-mass-tort`, `veterans-tdiu` |
| Experts | `/experts/` index + `/experts/jason-purinton/` (deep profile); index carries independent-economist-partner explanation |
| Locations | `/locations/nationwide/` (coverage hub: states served, remote + in-person, travel, depo/trial availability, labor-market and medical-cost research methodology) + `/locations/kansas-city/`, `/locations/st-louis/`, `/locations/denver/`, `/locations/chicago/` (honest "by appointment" language). **No state pages at launch** |
| Resources | `/resources/` index + `vocational-evaluation-records-checklist`, `life-care-plan-records-checklist`, `economic-loss-records-checklist`, `expert-disclosure-deadline-worksheet`, `vocational-expert-vs-economist-vs-life-care-planner`, `rebuttal-review-checklist`, `catastrophic-damages-team-referral-guide`, `faq`, `glossary` |
| Firm | `/about/` (history, standards, neutrality, QC process), `/refer-a-case/` (conflict-check intake), `/contact/` (general inquiries + CV/fee mini-form) |
| Policy | `/privacy/`, `/accessibility/`, `/disclaimer/`, custom `404.html` |

Checklist resources are full HTML pages with a print stylesheet (attorneys
print/save-as-PDF; no PDF generation pipeline). Every resource page exists as
crawlable HTML per the plan's lead-magnet guidance.

## Conversion system (`/refer-a-case/`)

Fields (all per plan §5): referring attorney + firm; email; phone; side
(plaintiff / defense / insurer / employer / neutral); service requested; case
type; jurisdiction + venue; case caption or conflict parties; expert disclosure
deadline; deposition/trial date; brief **non-confidential** summary; referral
source; urgency flag (rush / rebuttal / standard).

- Client-side validation with accessible labels and error messages (WCAG).
- Submits to Web3Forms with structured subject:
  `[Conflict Check] {side} · {case type} · {venue} · deadline {date}`.
- **No file upload field.** Prominent notice: do not submit medical records,
  SSNs, DOBs, financial records, or confidential documents; secure upload link
  is sent after conflict clearance.
- Honeypot must not be autofill-triggerable (KWVRS lesson: browser autofill
  fills styled-hidden fields; use `tabindex="-1"` + `autocomplete="off"` +
  `aria-hidden` off-screen field with a non-autofillable name, and prefer a
  time-based token check over field-only detection).
- `/contact/` = short general-inquiry form + CV/fee request mini-form
  (name, email, firm → same Web3Forms endpoint, different subject tag).
- Success page `/refer-a-case/thanks/` states response-time expectation and
  the urgent phone number.

## SEO / AI visibility layer (plan §7-8)

- **robots.txt** from config: Allow OAI-SearchBot, Claude-SearchBot,
  Claude-User, PerplexityBot, Googlebot, Bingbot; Disallow GPTBot and ClaudeBot
  (flip-able flags). Sitemap directive included.
- **sitemap.xml** with real per-page lastmod (from content `dateModified`,
  fallback build date).
- **llms.txt** — directory of firm, experts, services, guides, policies.
- **IndexNow** key file at root (key in config); submission itself is a
  post-launch operator task.
- **JSON-LD**: Organization + WebSite (home), Person with credentials/
  affiliations/sameAs (expert profile), Service + provider + areaServed
  (services), Article with author/reviewer/dates (resources), FAQPage (FAQ
  content), BreadcrumbList (all inner pages), ContactPage (contact). No
  reviews, no aggregate ratings, no LocalBusiness for by-appointment locations.
- Unique title/meta description/single H1 per page; self-referencing
  canonicals; OG image from brand assets; crawlable HTML anchors everywhere
  (no JS-only navigation); custom 404; compressed images; responsive layout.

## Content standards

- Objective tone; plaintiff-and-defense neutrality statement on: homepage,
  every service page, every matter page, expert profile, referral form,
  national coverage hub (plan §1 list).
- **No em dashes** (hyphens only). No credential logo badge strips (text lists
  fine). No fabricated anything: stats, addresses, reviews, credentials.
- Verified stats displayed but gated (Launch Checklist).
- Citations to real, checkable sources (BLS, government data, published
  standards) on methodology content. Publication standard: suitable for
  opposing counsel to read.
- Author/reviewer + published/updated dates on all resource pages.
  Reviewer = Jason Purinton for vocational and LCP content; economic-methods
  content stays descriptive and attributes signed analysis to independent
  economist partners.
- Economic-services language must state expressly that economists are
  independent partners (plan §1).

## Design

- Palette: navy primary (theme `#012262`), orange + teal accents, from
  PA-Site. Logo variants: `logo.svg` (navy, header) / `logo-light.svg`
  (white, footer). Favicons + og-default.png reused (regenerate OG later if
  brand line changes).
- Fresh layouts for national-authority positioning: proof band, 4-step
  referral process, coordinated-team diagram (three disciplines, clear role
  boundaries), expert profile with credentials sidebar.
- WCAG 2.2 AA intent: keyboard navigable, visible focus states, sufficient
  contrast, descriptive links, labeled forms, reduced-motion support.
  Accessibility page states actual testing performed, not aspirational claims.

## Testing (vitest, run in CI-fashion locally + Docker)

1. Build succeeds; every route in the inventory emits HTML.
2. JSON-LD on every page parses, validates required fields per type, and key
   values (name, phone, sameAs) match the entity record.
3. Zero broken internal links or asset references (crawl `dist/`).
4. Per-page invariants: exactly one H1; unique title + meta description
   across the site; canonical present; neutrality statement present on the
   mandated page set.
5. Referral form: all plan-mandated fields present with labels; no
   `type="file"` input anywhere on public forms; honeypot present.
6. robots.txt / sitemap.xml / llms.txt well-formed; sitemap URLs all resolve
   to built pages; no accidental noindex.
7. Banned-content greps: no em dashes in prose output, no "231 S. Bemiston",
   no "Schedule a Consultation" as primary CTA, no LocalBusiness schema with
   null addresses.

## Deploy

- Multi-stage Dockerfile: Node build (`astro build`) → Caddy serving `dist/`
  on `$PORT` (clean URLs, gzip, cache headers with hashed assets, branded 404)
  — same proven pattern as PA-Site.
- Local `docker build` + `docker run` + smoke test **before any push**
  (standing rule).
- New Railway service (do not reuse the PA-Site service). Custom domain
  attached only after purintonanalytics.com is registered. Nothing is deployed
  until Chris says so.
- pa-expert.com → purintonanalytics.com 301 redirect mapping is drafted as
  `docs/MIGRATION.md` (old-URL inventory from PA-Site + live pa-expert.com)
  but **not wired at launch**; it activates at DNS cutover per plan §2
  migration requirements.

## Launch checklist (LAUNCH-CHECKLIST.md in repo root)

Items requiring Jason/Chris confirmation before DNS cutover:

1. Register **purintonanalytics.com** (unregistered 2026-08-31 — do first).
2. Confirm the 3,000+ evaluations figure and every other displayed stat.
3. Confirm email address on new domain (e.g., jason@purintonanalytics.com)
   and update config + Web3Forms recipient.
4. Confirm office-location classifications (staffed vs appointment).
5. Name or confirm anonymity of independent economist partners.
6. Approve robots training-bot policy (GPTBot/ClaudeBot currently disallowed).
7. Google Search Console + Bing Webmaster verification, sitemap submission,
   IndexNow activation, Change of Address (if migrating from pa-expert.com).
8. External profile alignment (LinkedIn, SEAK, JurisPro, IARP, ABVE, AREA).

## Out of scope (launch)

State pages (plan: add 8-12 evidence-based states in Phase 4+), blog/original
research program, paid search, CRM/database, secure upload portal (link sent
manually post-clearance), video content, Google Business Profile work.
