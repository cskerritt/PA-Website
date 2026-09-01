# Locations Expansion Design: States, Metros, and Towns

Date: 2026-08-31
Status: Approved design, pre-implementation
Supersedes: the "No state pages at launch" line of
`2026-08-31-pa-website-design.md`. Everything else in that spec, and every
binding rule in `CLAUDE.md`, remains in force.

## Goal

Expand `/locations/` from 5 hand-written pages to a three-tier geographic
architecture of roughly 8,300 pages, giving the site an indexable landing
page for every state, every major metro, and the largest surrounding towns
of each metro, without triggering thin-content, scaled-content, or
doorway-page classification.

Decisions locked with Chris (2026-08-31):

1. Scope: 50 state hubs + top 15 metros per state + ~10 towns per metro.
2. Town selection: fixed N (top ~10 suburbs by Census population per metro).
3. Content depth: full-depth unique prose (~600 words) on every page, all
   tiers, matching the quality bar of the existing Chicago/Denver pages.
4. Rollout: phased waves staged as pre-built PRs, merged weekly over
   8 weeks. All content is generated up front.

## Page inventory

| Tier | Count | URL pattern |
|---|---|---|
| Locations index | 1 | `/locations/` (links to states + nationwide only) |
| Nationwide hub | 1 | `/locations/nationwide/` (unchanged) |
| State hubs | 50 | `/locations/missouri/` |
| Metro pages | ~750 | `/locations/missouri/kansas-city/` |
| Town pages | ~7,500 | `/locations/kansas/kansas-city/overland-park/` (see URL rules) |
| Total | ~8,300 | |

States with fewer than 15 Census core-based statistical areas (CBSAs) get
however many they actually have; micropolitan areas fill toward 15 where
metropolitan areas run out. No geography is invented to hit a quota.

### URL rules

- Hierarchical: `/locations/[state]/[metro]/` and
  `/locations/[state]/[metro]/[town]/`.
- Every place has exactly one canonical URL. A town always nests under its
  own state. For cross-state metros (Kansas City, New York, Philadelphia),
  the metro page lives under the principal city's state; a town on the other
  side of the line nests under its true state with the metro association
  carried in data, e.g. the Kansas City metro page is
  `/locations/missouri/kansas-city/` while Overland Park is
  `/locations/kansas/kansas-city/overland-park/` (state segment reflects the
  town's state; the metro segment names the parent metro).
- The 5 existing flat pages (`/locations/chicago/` etc.) migrate to their
  hierarchical URLs. The domain has never launched, so no redirects are
  required; internal links, tests, and the sitemap update in the same change.

## Data layer

New directory `src/data/geography/` containing checked-in JSON built once by
a script (`scripts/build-geography.mjs`) from public sources, then treated
as source of truth:

- `states.json`: name, slug, trial-court naming convention, list of federal
  districts, expert-disclosure regime note (state-rules vs FRCP-style),
  abbreviation.
- `metros.json`: CBSA name, slug, principal city, owning state, member
  counties (with state for cross-border counties), county seats, BLS OEWS
  area reference, population.
- `towns.json`: name, slug, parent metro slug, own state, county, population.

Sources: Census CBSA delineation files and place-population estimates for
geography and selection; court lists compiled per state from public
judiciary sources. BLS references stay qualitative in prose (no hard wage
numbers that go stale), same as the existing pages.

Binding rule at scale: **every fact rendered on a location page must exist
in these files.** Writer agents receive only the data slice for their pages
and may not introduce courts, counties, addresses, or numbers not present in
it. This is how the existing "no fabricated facts" rule survives 8,300
pages, and tests enforce it (see Testing).

## Content formula

All tiers keep the established voice: objective plaintiff-and-defense tone,
honest "by appointment, no street address" language, conflict-check CTA,
economist-partner rule, neutrality statement only where CLAUDE.md requires
it, no em dashes, publication standard suitable for opposing counsel.

- **State hub (~600 words):** the state's venue landscape (trial courts and
  federal districts by name), expert-disclosure timing note, how the firm
  serves the state (remote-first, travel from Kansas City), links to every
  metro page in the state and to `/locations/nationwide/`.
- **Metro page (~600 words):** the existing Chicago/Denver formula. County
  by county venue detail, federal district, labor-market character of the
  metro, by-appointment logistics, qualitative BLS OEWS framing, links up to
  the state hub and down to its town pages.
- **Town page (~600 words):** anchored on what is genuinely specific to the
  town so ten siblings in one metro do not converge: its county and the
  courthouse that county feeds, its position in the metro commuting labor
  market, population scale, evaluation logistics for an evaluee living
  there, links up to metro and state. No two town pages share an angle
  paragraph-for-paragraph; the similarity test enforces divergence.

Content lives as markdown in `src/content/locations/` with a frontmatter
schema extended for tier, state, metro, county, and data-file keys, rendered
by tier-aware templates under `src/pages/locations/`. JSON-LD renders from
the same data object as the visible content per the existing rule. No
LocalBusiness schema anywhere in the tree.

## Generation pipeline

Per the standing max-effort directive: Workflow orchestration with Fable
writer agents, batched by state, each given (a) a style guide distilled from
the 5 existing pages plus the binding CLAUDE.md rules and (b) only the
geography-data slice for its assigned pages. Adversarial verifier agents
review every batch for:

- cross-page n-gram similarity above threshold,
- em dashes and their HTML entities,
- any court, county, address, or statistic absent from the data files,
- banned patterns: LocalBusiness schema, street addresses, "Schedule a
  Consultation", economist-opinion attribution to Jason Purinton,
  neutrality-statement placement outside the required list.

Failed pages are rewritten, not patched by hand, so the pipeline stays
rerunnable. All ~8,300 pages are generated up front because the rollout is
pre-staged as PRs.

## Rollout: staged PRs over 8 weeks

The PR is the gate. There is no publish flag: a location page exists in the
build if and only if its markdown is on `main`. Merging a wave PR is what
makes its pages build, render, and enter the sitemap.

- **Wave 0 (merges first, part of launch):** 50 state hubs + ~750 metro
  pages + migration of the 5 existing flat pages + templates, data layer,
  sitemap index, and test extensions.
- **Waves 1 through 8 (one PR each, merged weekly):** all ~7,500 town
  pages, grouped by state, balanced to roughly 900 to 950 pages per wave,
  with high-litigation-volume states (CA, TX, FL, NY, PA, IL, and similar)
  in the early waves.
- Wave PRs only add town markdown files for their states. File sets are
  disjoint across waves and the sitemap and tests derive from content, so
  open PRs do not conflict while they wait.
- Each PR description states its target merge week and the post-merge
  checklist: `npm run check`, Docker smoke test, deploy, sitemap ping.
- Launch gates in `LAUNCH-CHECKLIST.md` still govern public exposure. Waves
  merge on the calendar; nothing is indexed until the domain is registered,
  DNS is cut, and Search Console is live. If Search Console shows the
  locations section being suppressed after early waves, remaining wave PRs
  are held rather than merged.

## Sitemap and internal linking

- `sitemap.xml` becomes a sitemap index; child sitemaps are per state
  (`sitemap-missouri.xml` and so on) plus one for the non-location site.
  Each wave merge changes only the affected states' child sitemaps.
- `/locations/` links to the 50 state hubs and nationwide, never to all
  8,300 pages. State hubs link to their metros; metros link to their towns
  and neighboring metros in the state; towns link up only. No page carries
  more than ~60 location links.

## Testing

Extend the dist-asserting suites:

1. Unique title, meta description, and single H1 across all location pages.
2. Every location page mentions its own county and court name exactly as
   spelled in the geography data (fact-grounding check).
3. Em-dash ban, already sitewide, now scaled.
4. Pairwise text-similarity check across location pages in the same metro
   and across random national samples; build fails above threshold.
5. Sitemap-index integrity: every built location page in exactly one child
   sitemap, no sitemap entry without a built page.
6. Neutrality-statement placement unchanged (location pages other than
   `/locations/nationwide/` do not add it).
7. Existing 930 tests stay green; the flat-to-hierarchical migration
   updates their location fixtures.

Build time grows substantially at full inventory (~8,300 static pages).
Wave 0 (~850 pages) lands first, and the Docker build stays the pre-push
gate; if full-inventory build time becomes a problem in later waves, that is
a build-tooling task, never a reason to skip `npm run check`.

## Risks, stated plainly

Seven and a half thousand town pages for a single-expert firm is an
aggressive footprint even executed well. The mitigations are the data-backed
uniqueness formula, full-depth prose, honest office language, and the
week-by-week wave structure with a hold rule. The risk of algorithmic
suppression of the locations section is reduced, not eliminated. The
economics still favor the attempt: the pages are cheap to hold, the wave
gate limits blast radius, and the metro tier alone is defensible on its own
merits.

## Out of scope

- No changes to services, matters, resources, or firm pages.
- No county-tier pages.
- No hard wage or cost statistics in prose.
- No PDF or print pipeline changes.
- No launch-gate decisions (domain registration, GSC, DNS remain Chris
  items in `LAUNCH-CHECKLIST.md`).
