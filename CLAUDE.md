# CLAUDE.md - PA-Website

Purinton Analytics national site (Astro 5, fully static, Caddy/Docker/Railway).
Read `docs/superpowers/specs/2026-08-31-pa-website-design.md` before content
work; `LAUNCH-CHECKLIST.md` lists what is gated on Jason/Chris.

## Content standards (binding, test-enforced)

- **Canonical domain only via `SITE.domain`** (`src/config/site.ts`). Never
  hardcode `https://purintonanalytics.com` in pages; `astro.config.mjs` must
  stay equal to `SITE.domain` (a sitewide test pins it).
- **Neutrality statement** (`SITE.neutralityStatement`, exact sentence) must
  appear on: homepage, every service page, every matter page, the expert
  profile, `/refer-a-case/`, and `/locations/nationwide/`.
- **No em dashes anywhere in rendered prose** - hyphens only. The test suite
  bans the literal character and its HTML entities in built output. Keep repo
  docs em-dash-free too.
- **No fabricated facts.** No street addresses (all offices are by
  appointment, address null), no reviews or ratings schema, no LocalBusiness
  schema, and never the fake "231 S. Bemiston" address.
- **Stats only from `SITE.stats`** (gated by `LAUNCH-CHECKLIST.md` item 2).
  The evaluations figure may appear in prose, but every rendered occurrence
  must match `SITE.stats[0]`; sitewide suite 14 fails on drift and the
  checklist enumerates the prose locations.
- **Economist-partner rule:** forensic economic analyses are performed and
  signed by independent economist partners coordinated by the firm. Never
  imply Jason C. Purinton issues economist opinions.
- **Primary CTA is "Request a Conflict Check"** - never "Schedule a
  Consultation".
- **No `type="file"` inputs** on any public form; the referral form carries a
  do-not-send-confidential-records warning.
- **JSON-LD renders from the same data object as the visible content**
  (`src/lib/jsonld.ts` + frontmatter). Never handwrite schema that could
  drift from the page.
- Objective plaintiff-and-defense tone. Publication standard: suitable for
  opposing counsel to read.
- Accessibility: WCAG 2.2 AA. Text colors must clear 4.5:1 (3:1 for large
  text and non-text indicators) - brand orange `#E87722` fails on white, so
  use `--orange-deep`/`--orange-focus` for text and focus on light grounds
  (see the token comments in `src/styles/global.css`). `/accessibility/`
  claims only what the build actually does; keep it true.

## Build and test

```bash
npm run check      # astro build && vitest run - use this, always
```

Tests assert against `dist/`, so **always build before testing**; `npm test`
alone is only valid immediately after a build. All suites green = shippable.

Deliberately noindexed (and out of sitemap.xml): `/refer-a-case/thanks/` and
the 404 page. Sitewide suite 13 and the seo-artifacts suite pin this; new
pages must be indexable and in the sitemap unless you extend both lists.

## Docker before push (standing rule)

```bash
docker build -t pa-website . && \
docker run -d -p 8090:8090 -e PORT=8090 --name pa-web pa-website && \
curl -fsS localhost:8090/ | grep -q "Nationwide Vocational Expert" && \
curl -s -o /dev/null -w '%{http_code}' localhost:8090/nope | grep -q 404; \
docker rm -f pa-web
```

## Deploy

Railway (DOCKERFILE builder, `railway.json`), new service - never the
PA-Site service. No deploy and no DNS work without Chris's explicit go;
redirects from pa-expert.com activate per `docs/MIGRATION.md` at cutover.
