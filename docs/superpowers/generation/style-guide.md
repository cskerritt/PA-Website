# Location Page Style Guide

Binding style rules for generated location landing pages (state, metro, and
town tiers). Distilled from the five existing pages, which define the voice
bar: `src/content/locations/nationwide.md`, `missouri/kansas-city.md`,
`missouri/st-louis.md`, `illinois/chicago.md`, and `colorado/denver.md`. All
excerpts below are verbatim from those pages. The deterministic verifier
(`scripts/geography/verify-content.mjs`) enforces a subset of these rules;
everything here is binding whether or not a regex can catch it.

## 1. Voice

Objective, measured, plaintiff-and-defense. Every sentence is written to be
read by opposing counsel: no marketing hype, no superlatives, no keyword
stuffing, no promises about outcomes. The firm's credibility claim is its
discipline, and the prose should demonstrate that discipline rather than
assert it.

Positive example (Chicago):

> Every engagement here begins the way
> it does everywhere else in the practice: with a documented conflict check, a
> defined scope, and a records request tailored to the claims, so that the
> written opinion rests on a record both sides can examine.

Always name both sides of the caption in your own words ("plaintiff and
defense engagements", "either side of the caption"). Do NOT reproduce the
site's neutrality statement itself: the exact sentence stored as
`SITE.neutralityStatement` in `src/config/site.ts`, which begins "Purinton
Analytics accepts engagements from both plaintiff and", must never appear in
any generated markdown body. The page layout renders that sentence where it
is required (including on the nationwide hub); writing it into a body would
make it render twice, and the verifier fails the file.

## 2. Honesty about presence

The firm has one home office, in Kansas City. Every other location is served
by appointment. Never print a street address, never imply a staffed local
office, storefront, or "our [city] office", and never invent local
logistics. Travel is always framed from the Kansas City home office. This
honesty is itself part of the brand voice: say plainly that there is no
staffed office and explain what counsel gets instead.

Positive example (Chicago):

> Chicago meetings are by appointment. The firm keeps no staffed storefront in
> the Loop and publishes no street address for this location, because accuracy
> about offices is part of the same discipline that governs its reports.

Positive example (Denver, travel framing):

> When the referral questions call for in-person
> evaluation, or when deposition and trial dates require presence, travel is
> scheduled from the Kansas City home office, and direct flights make
> short-notice appearances practical.

## 3. Facts: only what the brief provides

Use ONLY facts that appear in the brief's `facts` and `links` objects. Never
invent a court, courthouse, county, neighborhood, employer, highway, address,
statistic, or local characteristic. If a fact is not in the brief, write
around it.

- Courts: always by full expanded name on first mention, using the expansion
  convention `United States District Court for the Western District of
  Missouri`. The brief's `facts.federalDistricts` array already contains the
  expanded names; use them as given. State trial courts use the
  `facts.trialCourts` name (for example "Circuit Court").
- Counties: exactly as spelled in the brief, in the "X County" formation.
  The verifier cross-checks every "X County" mention against the geography
  data and fails the file on any unknown county.
- Cross-state metros: metro briefs carry counties as `{ name, state }`
  objects. When a metro spans states, you may ground a county in its state
  for clarity ("Johnson County, Kansas"), using the `state` field, never
  guesswork.

Positive example (Chicago):

> Engagements are accepted for matters in the Circuit Court of Cook County and
> the circuit courts of the collar counties, including DuPage, Lake, Will,
> Kane, and McHenry, and in the United States District Court for the Northern
> District of Illinois.

## 4. BLS references: qualitative only

Labor market sections name the Bureau of Labor Statistics occupational
employment and wage estimates (the OEWS program) and the metro or state area
they cover. Never a number: no wage figures, employment counts, growth
rates, or rankings.

Positive example (Denver):

> Vocational findings for Colorado evaluees rest on Bureau of Labor Statistics
> occupational employment and wage estimates for the Denver metropolitan area
> and for Colorado statewide, state workforce agency labor market information,
> and direct labor market research where warranted.

## 5. The economist-partner sentence

Forensic economic analyses are performed and signed by independent economist
partners coordinated by the firm. Never imply Jason C. Purinton issues
economist opinions. Copy the Denver page's phrasing pattern:

> [coordinated damages engagements](/services/coordinated-damages-assessment/)
> in which independent economist partners perform and sign the economic
> analysis while the vocational and care-planning work proceeds under one
> engagement structure.

## 6. Closing CTA

The closing section links `/refer-a-case/` with conflict-check language. The
primary CTA is always a conflict check, never "Schedule a Consultation".

Positive example (Chicago):

> Submit the caption or party names through the
> [conflict check form](/refer-a-case/) and note any imminent disclosure,
> deposition, or trial dates.

Positive example (Kansas City):

> To begin a local or national engagement,
> [request a conflict check](/refer-a-case/) with the case caption and parties.

## 7. Hard bans: em dashes and numbers

- No em dash characters anywhere, in frontmatter or body. The ban is on the
  em dash character itself, not on compound words. Normal English
  hyphenation is REQUIRED and expected: pre-deposition, cross-examination,
  open-ended, by-appointment, care-planning, short-notice. Use hyphens
  freely and correctly; a page stripped of ordinary hyphenated compounds
  reads as broken English.
- Never render any number in prose. This ban is absolute: no dollar
  figures, no percentages, no populations, no distances, no years, no rule
  or statute numbers, no counts of any kind, whether written as numerals or
  spelled out as quantities ("a community of roughly ninety thousand
  residents" is just as banned as "89,537 residents"). The deterministic
  verifier only catches dollar and percent figures; the rest of the ban is
  enforced here and by the adversarial reviewer. Describe scale
  qualitatively instead: "one of the largest labor markets in the country",
  "a small suburb", "a regional employment center".
- No rule citations (no "Rule 702", no statute numbers). The qualification
  note uses the "identified during intake" pattern (section 8), which
  needs no citation.

## 8. Structure per tier

Body prose under the H1 follows a fixed H2 outline per tier. H2 wording may
vary naturally page to page (and should, for divergence), but the sequence
and coverage are fixed.

State pages:

1. Venue landscape: the state trial courts and the expanded federal
   district courts, plus the metro pages within the state (link them).
2. How the firm serves the state: remote-first work, by-appointment
   meetings, travel from the Kansas City home office.
3. Qualification and disclosure note: use the "identified during intake"
   pattern, with no rule citations. Verbatim model (Denver):

   > Any venue-specific
   > registration or qualification requirement is identified and confirmed during
   > the conflict check and intake process.

4. Starting an engagement: conflict-check CTA per section 6.

Metro pages:

1. Intro naming the metro and linking the relevant service pages.
2. Venue footprint: counties (exactly as briefed) and courts (expanded).
3. By-appointment logistics: honesty about presence per section 2.
4. Labor market research: BLS OEWS framing per section 4.
5. Starting an engagement: conflict-check CTA per section 6.

Town pages:

1. Intro anchored on the town itself, not the metro.
2. County and courthouse context: the town's county exactly as briefed and
   the courts that serve it.
3. Position in the metro labor market: qualitative only, per sections 4
   and 7.
4. Evaluation logistics for a local evaluee: remote options, evaluation in
   the evaluee's community, travel from the Kansas City home office.
5. Starting an engagement: conflict-check CTA per section 6.

## 9. Length

500 to 700 words of body prose (frontmatter excluded). The deterministic
verifier fails state, metro, and town pages under 450 words (the hub floor
is 300, but the hub page already exists and is never generated); the
500-word target keeps a safety margin above the floor. Do not pad to reach
it: if a section runs thin, deepen the methodology or logistics discussion,
never the local color.

## 10. Divergence between sibling pages

Each town page in a metro must lead with a different first-paragraph angle
from its siblings. The brief lists the sibling towns of the same metro in
`facts.siblings`; treat every sibling as already written and do not reuse an
opening angle (county seat framing, commuter framing, industry framing,
courthouse framing, evaluee-logistics framing, and so on each count as one
angle). The verifier computes pairwise similarity within each metro and
fails pages that read as the same page with words swapped, so divergence
must be structural, not synonym swapping: vary the opening subject, the
section emphasis, and sentence rhythm, while keeping the section 8 outline.
