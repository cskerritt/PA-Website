# Locations Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `/locations/` from 5 flat pages to ~8,300 pages in three tiers (50 state hubs, ~750 metros, ~7,500 towns) with a checked-in geography data layer, full-depth generated prose, and rollout staged as 9 PRs (Wave 0 now, Waves 1-8 merged weekly).

**Architecture:** A one-time build script turns Census CBSA and population files plus an embedded court table into three JSON files under `src/data/geography/`, which become the only permitted source of rendered facts. A single catch-all Astro route renders all location tiers from content-collection markdown whose ids encode the hierarchical URL. Content is written by Fable writer agents in Workflow batches, checked by a deterministic verifier script that also runs inside vitest, and shipped as disjoint per-wave PRs.

**Tech Stack:** Astro 5 static output, TypeScript, vitest asserting against `dist/`, Node scripts (`.mjs`), SheetJS (`xlsx`) dev-only for the Census delineation file, `gh` CLI for PRs, Workflow tool with Fable agents for prose.

**Spec:** `docs/superpowers/specs/2026-08-31-locations-expansion-design.md`

## Global Constraints

- No em dashes or their HTML entities anywhere: rendered prose, repo docs, this plan's outputs, generated markdown. Hyphens only.
- Canonical domain only via `SITE.domain` (`src/config/site.ts`); never hardcode `https://purintonanalytics.com`.
- Neutrality statement (`SITE.neutralityStatement`, exact sentence) appears ONLY on the mandated list (homepage, service pages, matter pages, expert profile, `/refer-a-case/`, `/locations/nationwide/`). New state, metro, and town pages must NOT add it (sitewide suite 10 enumerates mandated pages; do not extend it).
- No fabricated facts: no street addresses, no reviews/ratings schema, no LocalBusiness schema, never "231 S. Bemiston". Every court, county, town, and population rendered on a location page must exist in `src/data/geography/*.json`.
- Stats only from `SITE.stats`; generated prose must not introduce evaluation counts or percentages.
- Economist-partner rule: economic analyses are performed and signed by independent economist partners; never imply Jason C. Purinton issues economist opinions.
- Primary CTA is "Request a Conflict Check", never "Schedule a Consultation".
- JSON-LD renders from the same data object as visible content (`src/lib/jsonld.ts` patterns).
- All pages indexable and in the sitemap except the pinned exclusions (`/refer-a-case/thanks/`, 404).
- `npm run check` (build then vitest) is the only valid verification; tests assert against `dist/`.
- Docker build + `docker run` smoke test before any push (CLAUDE.md standing rule).
- Commit messages end with the Co-Authored-By and Claude-Session trailers used by this session.

---

## File structure (end state)

```
scripts/
  geography/
    states-table.mjs          # embedded 50-state court/district table (source of truth)
    build-geography.mjs       # downloads Census files, writes the three JSON files + waves
    verify-content.mjs        # deterministic content checks, shared by CI tests and generation
  generation/
    make-briefs.mjs           # per-page fact briefs from geography JSON -> .generation/briefs/
src/data/geography/
  states.json                 # 50 records
  metros.json                 # ~750 records
  towns.json                  # ~7,500 records
  waves.json                  # state slug -> wave number (1..8) for town rollout
src/lib/geography.ts          # typed accessors + path helpers
src/pages/locations/
  index.astro                 # rewritten: nationwide + 50 state links
  [...slug].astro             # replaces [slug].astro; renders hub/state/metro/town by tier
src/pages/sitemap.xml.ts      # becomes a sitemapindex
src/pages/sitemap-core.xml.ts # non-location routes + /locations/ + nationwide
src/pages/sitemap-loc-[state].xml.ts  # per-state location URLs
src/content/locations/
  nationwide.md               # unchanged content, frontmatter gains tier: hub
  missouri.md ... (50 state files, Wave 0)
  missouri/kansas-city.md ... (metro files, Wave 0; existing 4 metros migrate here)
  kansas/kansas-city/overland-park.md ... (town files, Waves 1-8)
docs/superpowers/generation/
  style-guide.md              # distilled voice + binding rules for writer agents
  writer-prompt.md            # prompt template
  verifier-prompt.md          # adversarial review template
tests/
  geography.test.ts           # data-layer integrity
  locations.test.ts           # rewritten for tiers
  locations-content.test.ts   # verifier checks as a vitest suite (similarity, grounding)
```

---

### Task 1: Embedded state court table

**Files:**
- Create: `scripts/geography/states-table.mjs`

**Interfaces:**
- Produces: `export const STATES` array of `{ name, slug, abbr, trialCourts, federalDistricts }`, consumed by `build-geography.mjs` (Task 2) and verification.

- [ ] **Step 1: Write the table module**

```js
// scripts/geography/states-table.mjs
// Source of truth for state court naming and federal districts.
// trialCourts: the state's general-jurisdiction civil trial court name.
// federalDistricts: conventional reporter abbreviations, expanded in prose
// by the writer style guide (e.g. "W.D. Mo." renders as "the United States
// District Court for the Western District of Missouri").
export const STATES = [
  { name: 'Alabama', slug: 'alabama', abbr: 'AL', trialCourts: 'Circuit Court', federalDistricts: ['N.D. Ala.', 'M.D. Ala.', 'S.D. Ala.'] },
  { name: 'Alaska', slug: 'alaska', abbr: 'AK', trialCourts: 'Superior Court', federalDistricts: ['D. Alaska'] },
  { name: 'Arizona', slug: 'arizona', abbr: 'AZ', trialCourts: 'Superior Court', federalDistricts: ['D. Ariz.'] },
  { name: 'Arkansas', slug: 'arkansas', abbr: 'AR', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Ark.', 'W.D. Ark.'] },
  { name: 'California', slug: 'california', abbr: 'CA', trialCourts: 'Superior Court', federalDistricts: ['N.D. Cal.', 'E.D. Cal.', 'C.D. Cal.', 'S.D. Cal.'] },
  { name: 'Colorado', slug: 'colorado', abbr: 'CO', trialCourts: 'District Court', federalDistricts: ['D. Colo.'] },
  { name: 'Connecticut', slug: 'connecticut', abbr: 'CT', trialCourts: 'Superior Court', federalDistricts: ['D. Conn.'] },
  { name: 'Delaware', slug: 'delaware', abbr: 'DE', trialCourts: 'Superior Court', federalDistricts: ['D. Del.'] },
  { name: 'Florida', slug: 'florida', abbr: 'FL', trialCourts: 'Circuit Court', federalDistricts: ['N.D. Fla.', 'M.D. Fla.', 'S.D. Fla.'] },
  { name: 'Georgia', slug: 'georgia', abbr: 'GA', trialCourts: 'Superior Court', federalDistricts: ['N.D. Ga.', 'M.D. Ga.', 'S.D. Ga.'] },
  { name: 'Hawaii', slug: 'hawaii', abbr: 'HI', trialCourts: 'Circuit Court', federalDistricts: ['D. Haw.'] },
  { name: 'Idaho', slug: 'idaho', abbr: 'ID', trialCourts: 'District Court', federalDistricts: ['D. Idaho'] },
  { name: 'Illinois', slug: 'illinois', abbr: 'IL', trialCourts: 'Circuit Court', federalDistricts: ['N.D. Ill.', 'C.D. Ill.', 'S.D. Ill.'] },
  { name: 'Indiana', slug: 'indiana', abbr: 'IN', trialCourts: 'Circuit and Superior Courts', federalDistricts: ['N.D. Ind.', 'S.D. Ind.'] },
  { name: 'Iowa', slug: 'iowa', abbr: 'IA', trialCourts: 'District Court', federalDistricts: ['N.D. Iowa', 'S.D. Iowa'] },
  { name: 'Kansas', slug: 'kansas', abbr: 'KS', trialCourts: 'District Court', federalDistricts: ['D. Kan.'] },
  { name: 'Kentucky', slug: 'kentucky', abbr: 'KY', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Ky.', 'W.D. Ky.'] },
  { name: 'Louisiana', slug: 'louisiana', abbr: 'LA', trialCourts: 'District Court', federalDistricts: ['E.D. La.', 'M.D. La.', 'W.D. La.'] },
  { name: 'Maine', slug: 'maine', abbr: 'ME', trialCourts: 'Superior Court', federalDistricts: ['D. Me.'] },
  { name: 'Maryland', slug: 'maryland', abbr: 'MD', trialCourts: 'Circuit Court', federalDistricts: ['D. Md.'] },
  { name: 'Massachusetts', slug: 'massachusetts', abbr: 'MA', trialCourts: 'Superior Court', federalDistricts: ['D. Mass.'] },
  { name: 'Michigan', slug: 'michigan', abbr: 'MI', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Mich.', 'W.D. Mich.'] },
  { name: 'Minnesota', slug: 'minnesota', abbr: 'MN', trialCourts: 'District Court', federalDistricts: ['D. Minn.'] },
  { name: 'Mississippi', slug: 'mississippi', abbr: 'MS', trialCourts: 'Circuit Court', federalDistricts: ['N.D. Miss.', 'S.D. Miss.'] },
  { name: 'Missouri', slug: 'missouri', abbr: 'MO', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Mo.', 'W.D. Mo.'] },
  { name: 'Montana', slug: 'montana', abbr: 'MT', trialCourts: 'District Court', federalDistricts: ['D. Mont.'] },
  { name: 'Nebraska', slug: 'nebraska', abbr: 'NE', trialCourts: 'District Court', federalDistricts: ['D. Neb.'] },
  { name: 'Nevada', slug: 'nevada', abbr: 'NV', trialCourts: 'District Court', federalDistricts: ['D. Nev.'] },
  { name: 'New Hampshire', slug: 'new-hampshire', abbr: 'NH', trialCourts: 'Superior Court', federalDistricts: ['D.N.H.'] },
  { name: 'New Jersey', slug: 'new-jersey', abbr: 'NJ', trialCourts: 'Superior Court', federalDistricts: ['D.N.J.'] },
  { name: 'New Mexico', slug: 'new-mexico', abbr: 'NM', trialCourts: 'District Court', federalDistricts: ['D.N.M.'] },
  { name: 'New York', slug: 'new-york', abbr: 'NY', trialCourts: 'Supreme Court', federalDistricts: ['N.D.N.Y.', 'S.D.N.Y.', 'E.D.N.Y.', 'W.D.N.Y.'] },
  { name: 'North Carolina', slug: 'north-carolina', abbr: 'NC', trialCourts: 'Superior Court', federalDistricts: ['E.D.N.C.', 'M.D.N.C.', 'W.D.N.C.'] },
  { name: 'North Dakota', slug: 'north-dakota', abbr: 'ND', trialCourts: 'District Court', federalDistricts: ['D.N.D.'] },
  { name: 'Ohio', slug: 'ohio', abbr: 'OH', trialCourts: 'Court of Common Pleas', federalDistricts: ['N.D. Ohio', 'S.D. Ohio'] },
  { name: 'Oklahoma', slug: 'oklahoma', abbr: 'OK', trialCourts: 'District Court', federalDistricts: ['N.D. Okla.', 'E.D. Okla.', 'W.D. Okla.'] },
  { name: 'Oregon', slug: 'oregon', abbr: 'OR', trialCourts: 'Circuit Court', federalDistricts: ['D. Or.'] },
  { name: 'Pennsylvania', slug: 'pennsylvania', abbr: 'PA', trialCourts: 'Court of Common Pleas', federalDistricts: ['E.D. Pa.', 'M.D. Pa.', 'W.D. Pa.'] },
  { name: 'Rhode Island', slug: 'rhode-island', abbr: 'RI', trialCourts: 'Superior Court', federalDistricts: ['D.R.I.'] },
  { name: 'South Carolina', slug: 'south-carolina', abbr: 'SC', trialCourts: 'Circuit Court (Court of Common Pleas)', federalDistricts: ['D.S.C.'] },
  { name: 'South Dakota', slug: 'south-dakota', abbr: 'SD', trialCourts: 'Circuit Court', federalDistricts: ['D.S.D.'] },
  { name: 'Tennessee', slug: 'tennessee', abbr: 'TN', trialCourts: 'Circuit and Chancery Courts', federalDistricts: ['E.D. Tenn.', 'M.D. Tenn.', 'W.D. Tenn.'] },
  { name: 'Texas', slug: 'texas', abbr: 'TX', trialCourts: 'District Court', federalDistricts: ['N.D. Tex.', 'S.D. Tex.', 'E.D. Tex.', 'W.D. Tex.'] },
  { name: 'Utah', slug: 'utah', abbr: 'UT', trialCourts: 'District Court', federalDistricts: ['D. Utah'] },
  { name: 'Vermont', slug: 'vermont', abbr: 'VT', trialCourts: 'Superior Court', federalDistricts: ['D. Vt.'] },
  { name: 'Virginia', slug: 'virginia', abbr: 'VA', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Va.', 'W.D. Va.'] },
  { name: 'Washington', slug: 'washington', abbr: 'WA', trialCourts: 'Superior Court', federalDistricts: ['E.D. Wash.', 'W.D. Wash.'] },
  { name: 'West Virginia', slug: 'west-virginia', abbr: 'WV', trialCourts: 'Circuit Court', federalDistricts: ['N.D. W. Va.', 'S.D. W. Va.'] },
  { name: 'Wisconsin', slug: 'wisconsin', abbr: 'WI', trialCourts: 'Circuit Court', federalDistricts: ['E.D. Wis.', 'W.D. Wis.'] },
  { name: 'Wyoming', slug: 'wyoming', abbr: 'WY', trialCourts: 'District Court', federalDistricts: ['D. Wyo.'] },
];
```

- [ ] **Step 2: Verify the table adversarially**

Dispatch one Fable verification agent (Agent tool) with the table contents and this instruction: "For each of the 50 states, confirm (a) the name of the general-jurisdiction civil trial court and (b) the list of federal judicial districts, against uscourts.gov court-locator pages and state judiciary sites via WebFetch/WebSearch. Report any row that is wrong or ambiguous; do not rewrite the file." Fix any reported rows.

- [ ] **Step 3: Sanity-check the module loads**

Run: `node -e "import('./scripts/geography/states-table.mjs').then(m => { const s = m.STATES; if (s.length !== 50) throw new Error('need 50'); const d = s.flatMap(x => x.federalDistricts); console.log(s.length, 'states,', d.length, 'districts'); if (d.length !== 94) throw new Error('need 94 districts, got ' + d.length); })"`
Expected: `50 states, 94 districts` (the 94 federal districts include DC and territories; the 50-state subset totals 89. If the count check fails at 89, that is correct: change the assertion to 89 and keep the comment explaining DC/territories are out of scope).

- [ ] **Step 4: Commit**

```bash
git add scripts/geography/states-table.mjs
git commit -m "feat: embedded state court and federal district table"
```

---

### Task 2: Geography build script (metros)

**Files:**
- Create: `scripts/geography/build-geography.mjs`
- Create (generated): `src/data/geography/states.json`, `src/data/geography/metros.json`
- Modify: `package.json` (add `xlsx` devDependency, `geo:build` script)

**Interfaces:**
- Consumes: `STATES` from `scripts/geography/states-table.mjs`.
- Produces: `states.json` (records `{ name, slug, abbr, trialCourts, federalDistricts }`), `metros.json` (records `{ cbsa, name, slug, stateSlug, principalCity, counties: [{ name, state }], population }`). Task 3 extends this same script for towns.

- [ ] **Step 1: Install xlsx dev dependency**

Run: `npm install -D xlsx@^0.18.5`

- [ ] **Step 2: Write the build script (states + metros portion)**

Download sources (verify availability; if a vintage 404s, use the nearest newer vintage and note it in the script header):
- CBSA delineation: `https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx` (sheet rows: CBSA code, CBSA title, Metropolitan/Micropolitan flag, county name, state name, central/outlying flag)
- CBSA population: `https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/metro/totals/cbsa-est2024.csv`

```js
// scripts/geography/build-geography.mjs
// One-time builder for src/data/geography/*.json. Downloads Census inputs
// into .generation/census/ (gitignored) and emits deterministic JSON.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as XLSX from 'xlsx';
import { STATES } from './states-table.mjs';

const CACHE = '.generation/census';
const OUT = 'src/data/geography';
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const SOURCES = {
  delineation: 'https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx',
  cbsaPop: 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/metro/totals/cbsa-est2024.csv',
  placePop: 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv',
};

function fetchCached(url, file) {
  const path = `${CACHE}/${file}`;
  if (!existsSync(path)) execFileSync('curl', ['-fsSL', '-o', path, url], { stdio: 'inherit' });
  return path;
}

const slugify = (s) =>
  s.toLowerCase().replace(/['.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const stateByName = new Map(STATES.map((s) => [s.name, s]));
const stateByAbbr = new Map(STATES.map((s) => [s.abbr, s]));

// --- states.json (straight from the table) ---
writeFileSync(`${OUT}/states.json`, JSON.stringify(STATES, null, 2) + '\n');

// --- metros.json ---
const wb = XLSX.read(readFileSync(fetchCached(SOURCES.delineation, 'list1.xlsx')));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 2 }); // header offset: verify against the actual file
// Group delineation rows by CBSA code.
const byCbsa = new Map();
for (const r of rows) {
  const code = String(r['CBSA Code']);
  if (!byCbsa.has(code)) {
    byCbsa.set(code, {
      cbsa: code,
      title: r['CBSA Title'],
      kind: r['Metropolitan/Micropolitan Statistical Area'],
      counties: [],
    });
  }
  byCbsa.get(code).counties.push({
    name: r['County/County Equivalent'],
    state: r['State Name'],
  });
}
// CBSA populations (CSV columns: CBSA, NAME, LSAD, POPESTIMATE2024 ...).
const popCsv = readFileSync(fetchCached(SOURCES.cbsaPop, 'cbsa-pop.csv'), 'latin1');
const popByCbsa = new Map();
for (const line of popCsv.split('\n').slice(1)) {
  const cols = line.split(','); // NOTE: NAME contains commas and is quoted; use a
  // real CSV parse: split on /,(?=(?:[^"]*"[^"]*")*[^"]*$)/ and strip quotes.
  // Implement parseCsvLine() accordingly; asserted by the row-count check below.
  if (cols.length < 2) continue;
  const parsed = parseCsvLine(line);
  if (parsed.LSAD !== 'Metropolitan Statistical Area' && parsed.LSAD !== 'Micropolitan Statistical Area') continue;
  popByCbsa.set(parsed.CBSA, Number(parsed.POPESTIMATE2024));
}
// Assign each CBSA to the first state in its title (largest component by
// Census convention), rank within state, keep top 15.
const metrosByState = new Map(STATES.map((s) => [s.slug, []]));
for (const [code, m] of byCbsa) {
  const title = m.title; // e.g. "Kansas City, MO-KS"
  const abbr = title.split(',').pop().trim().split('-')[0];
  const st = stateByAbbr.get(abbr);
  if (!st) continue; // DC and PR CBSAs are out of scope
  const principalCity = title.split(',')[0].split('-')[0].trim();
  metrosByState.get(st.slug).push({
    cbsa: code,
    name: title,
    slug: slugify(principalCity),
    stateSlug: st.slug,
    principalCity,
    kind: m.kind,
    counties: m.counties.map((c) => ({ name: c.name, state: stateByName.get(c.state)?.abbr ?? c.state })),
    population: popByCbsa.get(code) ?? 0,
  });
}
const metros = [];
for (const [stateSlug, list] of metrosByState) {
  list.sort((a, b) => b.population - a.population);
  // Metropolitan areas first, micropolitan fill toward 15.
  const metro = list.filter((m) => m.kind.startsWith('Metro'));
  const micro = list.filter((m) => !m.kind.startsWith('Metro'));
  const picked = [...metro, ...micro].slice(0, 15);
  // Slug collisions within a state (two CBSAs, same principal city name):
  // suffix the later one with its CBSA code.
  const seen = new Set();
  for (const m of picked) {
    if (seen.has(m.slug)) m.slug = `${m.slug}-${m.cbsa}`;
    seen.add(m.slug);
    metros.push(m);
  }
}
metros.sort((a, b) => a.stateSlug.localeCompare(b.stateSlug) || b.population - a.population);
writeFileSync(`${OUT}/metros.json`, JSON.stringify(metros, null, 2) + '\n');
console.log(`states: ${STATES.length}, metros: ${metros.length}`);
```

Implementation notes for the executor (all binding):
- Implement `parseCsvLine()` properly (quoted fields with commas). Do not ship the naive split.
- Verify the delineation sheet's real header row and column names by printing `Object.keys(rows[0])` once; adjust the `range` option and key strings to match the actual file, then delete the debug print.
- The Kansas City CBSA title is "Kansas City, MO-KS": it must land under `missouri` with `principalCity` "Kansas City". Add an inline assertion:
  `const kc = metros.find((m) => m.slug === 'kansas-city' && m.stateSlug === 'missouri'); if (!kc) throw new Error('KC sanity check failed');`

- [ ] **Step 3: Add npm script and gitignore entry**

In `package.json` scripts add: `"geo:build": "node scripts/geography/build-geography.mjs"`. Append `.generation/` to `.gitignore`.

- [ ] **Step 4: Run and eyeball**

Run: `npm run geo:build && node -e "const m=require('./src/data/geography/metros.json'); console.log(m.length); console.log(m.filter(x=>x.stateSlug==='wyoming').map(x=>x.name))"`
Expected: total roughly 600-750 (states with fewer than 15 CBSAs contribute fewer); Wyoming shows Cheyenne and Casper metros plus micropolitans, all real places.

- [ ] **Step 5: Commit**

```bash
git add scripts/geography/build-geography.mjs src/data/geography/states.json src/data/geography/metros.json package.json package-lock.json .gitignore
git commit -m "feat: geography build script, states and metros datasets"
```

---

### Task 3: Geography build script (towns + waves)

**Files:**
- Modify: `scripts/geography/build-geography.mjs`
- Create (generated): `src/data/geography/towns.json`, `src/data/geography/waves.json`

**Interfaces:**
- Produces: `towns.json` records `{ name, slug, stateSlug, metroSlug, metroStateSlug, county, population }` and `waves.json` `{ [stateSlug]: waveNumber }`. Note `metroSlug`/`metroStateSlug` identify the parent metro page; `stateSlug` is the town's own state (they differ for cross-border metros).

- [ ] **Step 1: Extend the script with town extraction**

Append to `build-geography.mjs`:

```js
// --- towns.json ---
// sub-est2024.csv: SUMLEV 162 = incorporated place, SUMLEV 157 = place part
// within a county. Use 162 for the canonical population and 157 to assign
// each place to the county holding its largest part.
const placeCsv = readFileSync(fetchCached(SOURCES.placePop, 'place-pop.csv'), 'latin1');
const placeRows = placeCsv.split('\n').slice(1).map(parseCsvLine).filter((r) => r.NAME);
const places = new Map(); // key: STATE fips + PLACE fips
for (const r of placeRows.filter((r) => r.SUMLEV === '162')) {
  places.set(r.STATE + r.PLACE, {
    name: r.NAME.replace(/ (city|town|village|borough|CDP|municipality)$/i, ''),
    stateName: r.STNAME,
    population: Number(r.POPESTIMATE2024),
    countyParts: [],
  });
}
for (const r of placeRows.filter((r) => r.SUMLEV === '157')) {
  const p = places.get(r.STATE + r.PLACE);
  if (p) p.countyParts.push({ county: r.COUNTY, countyName: r.COUNAME ?? '', pop: Number(r.POPESTIMATE2024) });
}
// County name -> metro lookup: "<county name>|<state abbr>".
const metroByCounty = new Map();
for (const m of metros) {
  for (const c of m.counties) metroByCounty.set(`${c.name}|${c.state}`, m);
}
const towns = [];
for (const p of places.values()) {
  const st = stateByName.get(p.stateName);
  if (!st || p.population < 2500) continue;
  const top = p.countyParts.sort((a, b) => b.pop - a.pop)[0];
  if (!top || !top.countyName) continue;
  const metro = metroByCounty.get(`${top.countyName}|${st.abbr}`);
  if (!metro) continue;
  if (slugify(p.name) === metro.slug && st.slug === metro.stateSlug) continue; // principal city = metro page
  towns.push({
    name: p.name,
    slug: slugify(p.name),
    stateSlug: st.slug,
    metroSlug: metro.slug,
    metroStateSlug: metro.stateSlug,
    county: top.countyName,
    population: p.population,
  });
}
// Top 10 per metro, dedupe slug collisions inside a metro with county suffix.
const byMetro = new Map();
for (const t of towns) {
  const k = `${t.metroStateSlug}/${t.metroSlug}`;
  if (!byMetro.has(k)) byMetro.set(k, []);
  byMetro.get(k).push(t);
}
const kept = [];
for (const list of byMetro.values()) {
  list.sort((a, b) => b.population - a.population);
  const picked = list.slice(0, 10);
  const seen = new Set();
  for (const t of picked) {
    if (seen.has(`${t.stateSlug}/${t.slug}`)) t.slug = `${t.slug}-${slugify(t.county)}`;
    seen.add(`${t.stateSlug}/${t.slug}`);
    kept.push(t);
  }
}
kept.sort((a, b) => a.stateSlug.localeCompare(b.stateSlug) || b.population - a.population);
writeFileSync(`${OUT}/towns.json`, JSON.stringify(kept, null, 2) + '\n');

// --- waves.json: 8 waves, litigation-heavy states first, balanced by town count ---
const PRIORITY = ['california', 'texas', 'florida', 'new-york', 'pennsylvania', 'illinois', 'ohio', 'georgia', 'north-carolina', 'michigan', 'new-jersey', 'missouri', 'washington', 'massachusetts', 'colorado'];
const countByState = new Map();
for (const t of kept) countByState.set(t.stateSlug, (countByState.get(t.stateSlug) ?? 0) + 1);
const order = [...countByState.keys()].sort((a, b) => {
  const pa = PRIORITY.indexOf(a), pb = PRIORITY.indexOf(b);
  if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  return (countByState.get(b) ?? 0) - (countByState.get(a) ?? 0);
});
// Greedy fill: assign each state (in priority order) to the lightest wave
// among waves 1..8, but never let a priority state land later than a
// non-priority one: walk in order and fill waves to a per-wave budget.
const total = kept.length;
const budget = Math.ceil(total / 8);
const waves = {};
let wave = 1, load = 0;
for (const s of order) {
  const n = countByState.get(s);
  if (load + n > budget && wave < 8) { wave += 1; load = 0; }
  waves[s] = wave;
  load += n;
}
writeFileSync(`${OUT}/waves.json`, JSON.stringify(waves, null, 2) + '\n');
console.log(`towns: ${kept.length}, waves: ${new Set(Object.values(waves)).size}`);
```

Executor notes (binding):
- Print `Object.keys(placeRows[0])` once to confirm sub-est column names (`SUMLEV`, `STATE`, `PLACE`, `COUNTY`, `NAME`, `STNAME`, `POPESTIMATE2024`, and the county-name column; if there is no county-name column in the vintage used, resolve county names by joining `COUNTY` fips against the delineation file's county list for that state). Adjust keys, delete the debug print.
- Connecticut's 2024 vintage uses planning regions as county equivalents; if metro county names fail to match for CT, map planning-region names as they appear in the delineation file (both files use the same equivalents in matching vintages; assert at least one CT town survives).

- [ ] **Step 2: Run and validate counts**

Run: `npm run geo:build && node -e "const t=require('./src/data/geography/towns.json'), w=require('./src/data/geography/waves.json'); console.log('towns', t.length); const per={}; for (const s of Object.keys(w)) per[w[s]]=(per[w[s]]??0)+t.filter(x=>x.stateSlug===s).length; console.log(per); console.log(t.find(x=>x.slug==='overland-park'))"`
Expected: towns in the 5,000-7,500 range; 8 waves each roughly total/8 pages; Overland Park present with `stateSlug: 'kansas'`, `metroSlug: 'kansas-city'`, `metroStateSlug: 'missouri'`, county Johnson.

- [ ] **Step 3: Commit**

```bash
git add scripts/geography/build-geography.mjs src/data/geography/towns.json src/data/geography/waves.json
git commit -m "feat: towns dataset and 8-wave rollout assignments"
```

---

### Task 4: Typed geography accessors + data integrity tests

**Files:**
- Create: `src/lib/geography.ts`
- Test: `tests/geography.test.ts`

**Interfaces:**
- Produces (consumed by routes, sitemaps, and tests):
  - `interface GeoState { name: string; slug: string; abbr: string; trialCourts: string; federalDistricts: string[] }`
  - `interface GeoMetro { cbsa: string; name: string; slug: string; stateSlug: string; principalCity: string; kind: string; counties: { name: string; state: string }[]; population: number }`
  - `interface GeoTown { name: string; slug: string; stateSlug: string; metroSlug: string; metroStateSlug: string; county: string; population: number }`
  - `states(): GeoState[]`, `metros(): GeoMetro[]`, `towns(): GeoTown[]`, `waves(): Record<string, number>`
  - `metroPath(m: GeoMetro): string` returns `/locations/${m.stateSlug}/${m.slug}/`
  - `townPath(t: GeoTown): string` returns `/locations/${t.stateSlug}/${t.metroSlug}/${t.slug}/`
  - `statePath(s: GeoState | string): string` returns `/locations/${slug}/`

- [ ] **Step 1: Write failing tests**

```ts
// tests/geography.test.ts
import { describe, it, expect } from 'vitest';
import { states, metros, towns, waves, metroPath, townPath, statePath } from '../src/lib/geography';

describe('geography data integrity', () => {
  it('has 50 states with unique slugs', () => {
    expect(states().length).toBe(50);
    expect(new Set(states().map((s) => s.slug)).size).toBe(50);
  });
  it('every metro belongs to a real state and has counties', () => {
    const slugs = new Set(states().map((s) => s.slug));
    for (const m of metros()) {
      expect(slugs.has(m.stateSlug), m.name).toBe(true);
      expect(m.counties.length, m.name).toBeGreaterThan(0);
      expect(m.population, m.name).toBeGreaterThan(0);
    }
  });
  it('no state exceeds 15 metros', () => {
    const per = new Map<string, number>();
    for (const m of metros()) per.set(m.stateSlug, (per.get(m.stateSlug) ?? 0) + 1);
    for (const [s, n] of per) expect(n, s).toBeLessThanOrEqual(15);
  });
  it('every town references a real metro and has a county', () => {
    const metroKeys = new Set(metros().map((m) => `${m.stateSlug}/${m.slug}`));
    for (const t of towns()) {
      expect(metroKeys.has(`${t.metroStateSlug}/${t.metroSlug}`), t.name).toBe(true);
      expect(t.county.length, t.name).toBeGreaterThan(0);
      expect(t.population).toBeGreaterThanOrEqual(2500);
    }
  });
  it('town URLs are globally unique', () => {
    const paths = towns().map(townPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it('waves cover every town state with values 1..8', () => {
    const w = waves();
    for (const t of towns()) {
      expect(w[t.stateSlug], t.stateSlug).toBeGreaterThanOrEqual(1);
      expect(w[t.stateSlug], t.stateSlug).toBeLessThanOrEqual(8);
    }
  });
  it('path helpers', () => {
    expect(statePath('missouri')).toBe('/locations/missouri/');
    const kc = metros().find((m) => m.slug === 'kansas-city' && m.stateSlug === 'missouri')!;
    expect(metroPath(kc)).toBe('/locations/missouri/kansas-city/');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/geography.test.ts`
Expected: FAIL, cannot resolve `../src/lib/geography`.

- [ ] **Step 3: Implement**

```ts
// src/lib/geography.ts
import statesJson from '../data/geography/states.json';
import metrosJson from '../data/geography/metros.json';
import townsJson from '../data/geography/towns.json';
import wavesJson from '../data/geography/waves.json';

export interface GeoState { name: string; slug: string; abbr: string; trialCourts: string; federalDistricts: string[] }
export interface GeoMetro { cbsa: string; name: string; slug: string; stateSlug: string; principalCity: string; kind: string; counties: { name: string; state: string }[]; population: number }
export interface GeoTown { name: string; slug: string; stateSlug: string; metroSlug: string; metroStateSlug: string; county: string; population: number }

export const states = (): GeoState[] => statesJson as GeoState[];
export const metros = (): GeoMetro[] => metrosJson as GeoMetro[];
export const towns = (): GeoTown[] => townsJson as GeoTown[];
export const waves = (): Record<string, number> => wavesJson as Record<string, number>;

export const statePath = (s: GeoState | string): string =>
  `/locations/${typeof s === 'string' ? s : s.slug}/`;
export const metroPath = (m: GeoMetro): string => `/locations/${m.stateSlug}/${m.slug}/`;
export const townPath = (t: GeoTown): string => `/locations/${t.stateSlug}/${t.metroSlug}/${t.slug}/`;
```

(If `tsconfig.json` lacks `resolveJsonModule`, add it.)

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/geography.test.ts`
Expected: PASS (note: this suite does not read `dist/`, so it may run without a build).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geography.ts tests/geography.test.ts tsconfig.json
git commit -m "feat: typed geography accessors with integrity tests"
```

---

### Task 5: Tiered content schema, hierarchical route, migration of existing pages

**Files:**
- Modify: `src/content.config.ts` (locations schema)
- Create: `src/pages/locations/[...slug].astro`
- Delete: `src/pages/locations/[slug].astro`
- Modify: `src/pages/locations/index.astro` (states listing)
- Modify: `src/config/site.ts` (add `path` to each office record)
- Move + edit: `src/content/locations/{chicago,denver,kansas-city,st-louis}.md` to hierarchical ids; `nationwide.md` frontmatter gains `tier: hub`
- Test: `tests/locations.test.ts` (rewrite fixtures)

**Interfaces:**
- Consumes: `states()`, `metros()`, `towns()`, `metroPath`, `townPath`, `statePath` from `src/lib/geography.ts`.
- Produces: content entry ids equal URL path under `/locations/` (e.g. `missouri/kansas-city`); frontmatter discriminated union on `tier: 'hub' | 'state' | 'metro' | 'town'`. Tasks 6-11 rely on: a built page exists at `dist/locations/<entry.id>/index.html` for every entry, and `entry.data.tier` is authoritative.

- [ ] **Step 1: Update the locations schema in `src/content.config.ts`**

Replace the current `locations` collection definition with:

```ts
const locBase = {
  title: z.string(),
  metaDescription: z.string().min(70).max(165),
  h1: z.string(),
};
locations: defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/locations' }),
  schema: z.discriminatedUnion('tier', [
    z.object({ tier: z.literal('hub'), ...locBase }),
    z.object({ tier: z.literal('state'), ...locBase, state: z.string(), stateSlug: z.string() }),
    z.object({
      tier: z.literal('metro'), ...locBase,
      state: z.string(), stateSlug: z.string(),
      metro: z.string(), metroSlug: z.string(),
      counties: z.array(z.string()).min(1),
      city: z.string().optional(), // kept for the office panel + breadcrumbs
    }),
    z.object({
      tier: z.literal('town'), ...locBase,
      state: z.string(), stateSlug: z.string(),
      metro: z.string(), metroSlug: z.string(), metroStateSlug: z.string(),
      town: z.string(), townSlug: z.string(),
      county: z.string(),
    }),
  ]),
}),
```

- [ ] **Step 2: Migrate the five existing files**

```bash
cd src/content/locations
mkdir -p missouri illinois colorado
git mv chicago.md illinois/chicago.md
git mv denver.md colorado/denver.md
git mv kansas-city.md missouri/kansas-city.md
git mv st-louis.md missouri/st-louis.md
```

Edit each moved file's frontmatter, adding tier fields. Example for `missouri/kansas-city.md` (values for the others follow the same pattern; counties come verbatim from `metros.json` for that metro):

```yaml
tier: metro
state: "Missouri"
stateSlug: "missouri"
metro: "Kansas City, MO-KS"
metroSlug: "kansas-city"
counties: ["Jackson County", "Clay County", "Platte County", "Cass County", "Johnson County", "Wyandotte County"]
```

(`counties` must be copied from the actual `metros.json` record, not this example.) Add `tier: hub` to `nationwide.md`. Keep existing `city`/`regionFull` keys on the four metro files only if the schema keeps them; `regionFull` is dropped, so delete that key.

- [ ] **Step 3: Add office paths in `src/config/site.ts`**

Each record in `SITE.offices` gains a `path` field: kansas-city `/locations/missouri/kansas-city/`, st-louis `/locations/missouri/st-louis/`, denver `/locations/colorado/denver/`, chicago `/locations/illinois/chicago/`.

- [ ] **Step 4: Write the catch-all route**

Create `src/pages/locations/[...slug].astro`. Start from the current `[slug].astro` (same imports, office panel markup, styles) with these changes:

```astro
---
export async function getStaticPaths() {
  const entries = await getCollection('locations');
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}
const { entry } = Astro.props;
const { Content } = await render(entry);
const data = entry.data;
const path = `/locations/${entry.id}/`;

// Breadcrumbs by tier.
const crumbs = [{ name: 'Home', path: '/' }, { name: 'Locations', path: '/locations/' }];
if (data.tier === 'hub') crumbs.push({ name: 'National Coverage', path });
if (data.tier === 'state') crumbs.push({ name: data.state, path });
if (data.tier === 'metro') crumbs.push(
  { name: data.state, path: `/locations/${data.stateSlug}/` },
  { name: data.metro, path },
);
if (data.tier === 'town') crumbs.push(
  { name: data.state, path: `/locations/${data.stateSlug}/` },
  { name: data.metro, path: `/locations/${data.metroStateSlug}/${data.metroSlug}/` },
  { name: data.town, path },
);

// Office panel only where a real office record matches this page.
const office = SITE.offices.find((o) => o.path === path);

// Tier-scoped link blocks (cap: no page lists more than ~60 location links).
import { states, metros, towns, metroPath, townPath, statePath } from '../../lib/geography';
let linkBlocks: { heading: string; links: { name: string; href: string }[] }[] = [];
if (data.tier === 'state') {
  linkBlocks = [{
    heading: `${data.state} metro areas`,
    links: metros().filter((m) => m.stateSlug === data.stateSlug)
      .map((m) => ({ name: m.name, href: metroPath(m) })),
  }];
}
if (data.tier === 'metro') {
  const mine = towns().filter((t) => t.metroStateSlug === data.stateSlug && t.metroSlug === data.metroSlug);
  const neighbors = metros().filter((m) => m.stateSlug === data.stateSlug && m.slug !== data.metroSlug).slice(0, 8);
  linkBlocks = [
    { heading: 'Communities in this metro', links: mine.map((t) => ({ name: t.name, href: townPath(t) })) },
    { heading: `Other ${data.state} metro areas`, links: neighbors.map((m) => ({ name: m.name, href: metroPath(m) })) },
  ];
}
if (data.tier === 'town') {
  linkBlocks = [{
    heading: 'Coverage',
    links: [
      { name: `${data.metro} metro`, href: `/locations/${data.metroStateSlug}/${data.metroSlug}/` },
      { name: data.state, href: statePath(data.stateSlug) },
      { name: 'National coverage', href: '/locations/nationwide/' },
    ],
  }];
}
---
```

Render `linkBlocks` after `<Content />` as `<nav aria-label="Related locations">` sections using the existing card/list styling; keep `<NeutralityStatement />` ONLY when `data.tier === 'hub'` (nationwide is the one mandated location page); keep `ProofBand` on the hub only; `CTABand` on all. Breadcrumb JSON-LD via the existing `breadcrumbJsonLd(crumbs)` from `src/lib/jsonld.ts` in the BaseLayout JSON-LD slot, matching how other pages inject it. **Important:** a Workflow town page must NOT filter `towns()` by `t.stateSlug === data.stateSlug` for link display; the parent metro is identified by `metroStateSlug` + `metroSlug` as shown.

Also: metro-tier pages whose towns are not yet merged (early waves) render an empty "Communities in this metro" list; guard the block with `mine.length > 0` so nothing renders until the wave lands.

Delete `src/pages/locations/[slug].astro`.

- [ ] **Step 5: Rewrite `/locations/` index**

Replace the card grid body of `src/pages/locations/index.astro`: keep the intro paragraph and the National Coverage card, replace the office cards with (a) the four office cards using `office.path` and (b) a 50-state link list:

```astro
<h2>Coverage by state</h2>
<ul class="state-list">
  {states().map((s) => (
    <li><a href={statePath(s)}>{s.name}</a></li>
  ))}
</ul>
```

State links render only for states that have a built state page during Wave 0 development; since all 50 state pages ship in Wave 0, no gating is needed. (Until Task 9 content exists, the build will fail on dead links only if a test checks them; the locations test rewrite in Step 6 asserts hub/index/metro fixtures only, and the full 50-state assertion is added in Task 9.)

- [ ] **Step 6: Rewrite `tests/locations.test.ts` fixtures**

Update the constants at the top:

```ts
const HUB = 'locations/nationwide';
const INDEX = 'locations';
const METROS = [
  { slug: 'missouri/kansas-city', city: 'Kansas City' },
  { slug: 'missouri/st-louis', city: 'St. Louis' },
  { slug: 'colorado/denver', city: 'Denver' },
  { slug: 'illinois/chicago', city: 'Chicago' },
];
const ALL_LOCATION_PATHS = [INDEX, HUB, ...METROS.map((m) => `locations/${m.slug}`)];
```

Walk the rest of the suite: any assertion built on `locations/${slug}` single-segment paths updates to the new ids; the office-panel assertions key off `SITE.offices[n].path`. Add one new test:

```ts
it('office panel appears on all four office metro pages and nowhere else sampled', () => {
  for (const m of METROS) {
    expect(main(`locations/${m.slug}`).querySelector('.loc-office-facts')).toBeTruthy();
  }
  expect(main(HUB).querySelector('.loc-office-facts')).toBeNull();
});
```

- [ ] **Step 7: Full check**

Run: `npm run check`
Expected: build succeeds; all suites pass (sitemap suite still passes because `sitemap.xml.ts` derives location URLs from `entry.id`, which now contains the hierarchical path; verify this by reading the sitemap output for `locations/missouri/kansas-city/`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: hierarchical location tiers, catch-all route, migrate metro pages"
```

---

### Task 6: Sitemap index + per-state location sitemaps

**Files:**
- Modify: `src/pages/sitemap.xml.ts` (becomes sitemapindex)
- Create: `src/pages/sitemap-core.xml.ts`
- Create: `src/pages/sitemap-loc-[state].xml.ts`
- Test: `tests/seo-artifacts.test.ts` (rework sitemap section)

**Interfaces:**
- Consumes: `getCollection('locations')`, `SITE.domain`, entry ids from Task 5.
- Produces: `/sitemap.xml` (index), `/sitemap-core.xml` (all non-location routes plus `/locations/` and `/locations/nationwide/`), `/sitemap-loc-<state>.xml` for each state slug that has at least one non-hub location entry. `robots.txt` continues to point at `/sitemap.xml` (no change needed).

- [ ] **Step 1: Write the failing test rework**

In `tests/seo-artifacts.test.ts`, replace `sitemapLocs()` and the `sitemap.xml` describe block:

```ts
function childSitemaps(): string[] {
  const xml = distFile('sitemap.xml');
  expect(xml).toContain('<sitemapindex');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
function sitemapLocs(): string[] {
  const out: string[] = [];
  for (const child of childSitemaps()) {
    const file = child.slice(SITE.domain.length).replace(/^\//, '');
    for (const m of distFile(file).matchAll(/<loc>([^<]+)<\/loc>/g)) out.push(m[1]);
  }
  return out;
}

describe('sitemap index', () => {
  it('lists sitemap-core plus one child per location state', () => {
    const children = childSitemaps();
    expect(children).toContain(`${SITE.domain}/sitemap-core.xml`);
    for (const c of children) expect(c).toMatch(/\/sitemap-(core|loc-[a-z-]+)\.xml$/);
  });
  it('every child is well-formed and non-empty', () => {
    for (const child of childSitemaps()) {
      const xml = distFile(child.slice(SITE.domain.length).replace(/^\//, ''));
      expect(xml).toContain('<urlset');
      expect(xml.match(/<url>/g)!.length).toBeGreaterThan(0);
    }
  });
});
```

Keep the existing "every loc resolves to a built page", "unique", and "covers every built route" tests, now running against the aggregated `sitemapLocs()`. Keep the `>= 38` floor.

- [ ] **Step 2: Run to verify failure**

Run: `npm run check`
Expected: seo-artifacts suite FAILS (`sitemap.xml` is still a urlset).

- [ ] **Step 3: Implement the three endpoints**

`src/pages/sitemap-core.xml.ts`: the current `sitemap.xml.ts` logic, minus the loop over the locations collection, plus two location entries pinned by hand: `/locations/` and `/locations/nationwide/`. Export a shared renderer to avoid duplication:

```ts
// shared helper at top of sitemap-core.xml.ts, exported for the state endpoint
export function urlsetXml(urls: { path: string; lastmod: string }[], domain: string): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url>\n    <loc>${domain}${u.path}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n') +
    '\n</urlset>\n';
}
```

`src/pages/sitemap-loc-[state].xml.ts`:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';
import { urlsetXml } from './sitemap-core.xml';

const BUILD_DATE = new Date().toISOString().slice(0, 10);

export async function getStaticPaths() {
  const entries = await getCollection('locations');
  const states = new Set(
    entries.filter((e) => e.data.tier !== 'hub').map((e) => e.id.split('/')[0]),
  );
  return [...states].map((state) => ({ params: { state } }));
}

export const GET: APIRoute = async ({ params }) => {
  const entries = await getCollection('locations');
  const urls = entries
    .filter((e) => e.data.tier !== 'hub' && e.id.split('/')[0] === params.state)
    .map((e) => ({ path: `/locations/${e.id}/`, lastmod: BUILD_DATE }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return new Response(urlsetXml(urls, SITE.domain), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

`src/pages/sitemap.xml.ts` becomes:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';

export const GET: APIRoute = async () => {
  const entries = await getCollection('locations');
  const states = [...new Set(entries.filter((e) => e.data.tier !== 'hub').map((e) => e.id.split('/')[0]))].sort();
  const children = ['/sitemap-core.xml', ...states.map((s) => `/sitemap-loc-${s}.xml`)];
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    children.map((c) => `  <sitemap>\n    <loc>${SITE.domain}${c}</loc>\n  </sitemap>`).join('\n') +
    '\n</sitemapindex>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
```

Note: the "covers every built route" test's `builtRoutes()` walks `dist/` for HTML pages, so the XML children themselves do not need excluding; confirm its glob ignores `.xml` files, and extend the ignore if it picks them up.

- [ ] **Step 4: Run full check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/sitemap.xml.ts src/pages/sitemap-core.xml.ts src/pages/sitemap-loc-\[state\].xml.ts tests/seo-artifacts.test.ts
git commit -m "feat: sitemap index with per-state location sitemaps"
```

---

### Task 7: Deterministic content verifier

**Files:**
- Create: `scripts/geography/verify-content.mjs`
- Test: `tests/locations-content.test.ts`

**Interfaces:**
- Consumes: markdown files in `src/content/locations/`, geography JSON.
- Produces: `verifyLocationContent(files?: string[])` returning `{ ok: boolean; problems: { file: string; rule: string; detail: string }[] }`; CLI mode `node scripts/geography/verify-content.mjs [files...]` exits 1 with a problem list. Rules (each is a `rule` string): `em-dash`, `banned-phrase`, `neutrality-misplaced`, `fabricated-court`, `fabricated-county`, `numeric-claim`, `similarity`, `length`, `frontmatter-path-mismatch`.

- [ ] **Step 1: Write the verifier**

```js
// scripts/geography/verify-content.mjs
// Deterministic gate for generated location prose. Also imported by the
// vitest suite so CI and the generation pipeline enforce identical rules.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src/content/locations';
const geo = (f) => JSON.parse(readFileSync(`src/data/geography/${f}`, 'utf8'));

const BANNED = [
  /—|&mdash;|&#8212;/,                      // em dash
  /Schedule a Consultation/i,
  /LocalBusiness/,
  /231 S\.? Bemiston/i,
  /\b\d{2,5}\s+[A-Z][a-z]+ (Street|St\.|Avenue|Ave\.|Boulevard|Blvd\.|Suite)\b/, // street address
];
const NEUTRALITY_SNIPPET = 'plaintiff and defense'; // presence check uses SITE wording below

function listFiles() {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.md')) out.push(p);
    }
  };
  walk(ROOT);
  return out;
}

function parseFm(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: '', body: src };
  return { fm: m[1], body: m[2] };
}

const fiveGrams = (text) => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const grams = new Set();
  for (let i = 0; i + 5 <= words.length; i += 1) grams.add(words.slice(i, i + 5).join(' '));
  return grams;
};
const jaccard = (a, b) => {
  let inter = 0;
  for (const g of a) if (b.has(g)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
};
const SIMILARITY_MAX = 0.35;

export function verifyLocationContent(files) {
  const all = files ?? listFiles();
  const problems = [];
  const states = geo('states.json');
  const metrosData = geo('metros.json');
  const townsData = geo('towns.json');
  const courtNames = new Set([
    ...states.map((s) => s.trialCourts),
    ...states.flatMap((s) => s.federalDistricts),
  ]);
  const countyNames = new Set(metrosData.flatMap((m) => m.counties.map((c) => c.name)));
  const docs = [];

  for (const file of all) {
    const rel = relative(ROOT, file).replace(/\.md$/, '');
    const src = readFileSync(file, 'utf8');
    const { fm, body } = parseFm(src);
    for (const re of BANNED) {
      if (re.test(src)) problems.push({ file, rule: re.source.includes('2014') ? 'em-dash' : 'banned-phrase', detail: String(re) });
    }
    // Fabrication guards: any "X County" or "District of X" mentioned must be known.
    for (const m of body.matchAll(/\b([A-Z][A-Za-z.' -]+ County)\b/g)) {
      if (!countyNames.has(m[1])) problems.push({ file, rule: 'fabricated-county', detail: m[1] });
    }
    for (const m of body.matchAll(/District of [A-Z][A-Za-z ]+/g)) {
      const known = states.some((s) => s.federalDistricts.some((d) => expandDistrict(d, s.name).includes(m[0])));
      if (!known) problems.push({ file, rule: 'fabricated-court', detail: m[0] });
    }
    // Numeric hygiene: no dollar figures, percentages, or evaluation counts.
    if (/\$\d|\b\d+(\.\d+)?\s*(%|percent)\b/.test(body)) {
      problems.push({ file, rule: 'numeric-claim', detail: 'dollar/percent figure in prose' });
    }
    // Length floor for full-depth prose (frontmatter excluded).
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const tier = /(^|\n)tier:\s*(\w+)/.exec(fm)?.[2] ?? 'unknown';
    const floor = tier === 'hub' ? 300 : 450;
    if (wordCount < floor) problems.push({ file, rule: 'length', detail: `${wordCount} words (< ${floor})` });
    // Frontmatter path agreement.
    const fmOf = (k) => /(^|\n)KEY:\s*"?([^"\n]+)"?/.source; // implemented per-key below
    const get = (k) => new RegExp(`(^|\\n)${k}:\\s*"?([^"\\n]+)"?`).exec(fm)?.[2];
    if (tier === 'state' && rel !== get('stateSlug')) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    if (tier === 'metro' && rel !== `${get('stateSlug')}/${get('metroSlug')}`) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    if (tier === 'town' && rel !== `${get('stateSlug')}/${get('metroSlug')}/${get('townSlug')}`) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    docs.push({ file, rel, tier, grams: fiveGrams(body), metroKey: get('metroStateSlug') ? `${get('metroStateSlug')}/${get('metroSlug')}` : null });
  }

  // Similarity: all pairs within a metro, plus a seeded random national sample.
  const byMetro = new Map();
  for (const d of docs) if (d.metroKey) {
    if (!byMetro.has(d.metroKey)) byMetro.set(d.metroKey, []);
    byMetro.get(d.metroKey).push(d);
  }
  const checkPair = (a, b) => {
    const sim = jaccard(a.grams, b.grams);
    if (sim > SIMILARITY_MAX) problems.push({ file: a.file, rule: 'similarity', detail: `${sim.toFixed(2)} vs ${b.rel}` });
  };
  for (const group of byMetro.values()) {
    for (let i = 0; i < group.length; i += 1)
      for (let j = i + 1; j < group.length; j += 1) checkPair(group[i], group[j]);
  }
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let k = 0; k < Math.min(2000, docs.length * 2); k += 1) {
    const a = docs[Math.floor(rand() * docs.length)];
    const b = docs[Math.floor(rand() * docs.length)];
    if (a !== b) checkPair(a, b);
  }
  return { ok: problems.length === 0, problems };
}

export function expandDistrict(abbr, stateName) {
  // "W.D. Mo." -> "United States District Court for the Western District of Missouri"
  const dir = { N: 'Northern', S: 'Southern', E: 'Eastern', W: 'Western', M: 'Middle', C: 'Central' };
  const m = abbr.match(/^([NSEWMC])\.?D\./);
  const prefix = m ? `${dir[m[1]]} ` : '';
  return `United States District Court for the ${prefix}District of ${stateName}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  const res = verifyLocationContent(files.length ? files : undefined);
  for (const p of res.problems) console.error(`${p.rule}: ${p.file} :: ${p.detail}`);
  console.log(res.ok ? 'OK' : `${res.problems.length} problems`);
  process.exit(res.ok ? 0 : 1);
}
```

Executor notes (binding):
- The neutrality-misplacement rule: location markdown must NOT contain `SITE.neutralityStatement` text (the component renders it on the hub). Import the sentence by reading `src/config/site.ts` is overkill; hardcode the first eight words of the statement in one constant with a comment pointing at `site.ts`, and add a `neutrality-misplaced` problem if a location body contains it.
- The `fabricated-county` regex will flag counties legitimately named in a *different* metro's data (they are in `countyNames`, so they pass). That is accepted: the grounding contract is "exists in the dataset", per spec.
- Remove the dead `fmOf` line; it is a sketch artifact. Use the `get(k)` helper only.
- `District of Columbia` will false-positive `fabricated-court`; add it to an allowlist only if prose ever needs it (it should not).

- [ ] **Step 2: Write the vitest wrapper**

```ts
// tests/locations-content.test.ts
import { describe, it, expect } from 'vitest';
import { verifyLocationContent } from '../scripts/geography/verify-content.mjs';

describe('location content verifier', () => {
  it('all location markdown passes every deterministic rule', () => {
    const res = verifyLocationContent();
    const summary = res.problems.slice(0, 25).map((p) => `${p.rule}: ${p.file} :: ${p.detail}`).join('\n');
    expect(res.ok, summary).toBe(true);
  }, 120_000);
});
```

- [ ] **Step 3: Run against the migrated pages**

Run: `node scripts/geography/verify-content.mjs`
Expected: OK, or a short list of real problems in the five existing pages (e.g. a county mention absent from `metros.json` county spellings). Fix the *pages* (or county-name normalization in the verifier, e.g. delineation file says "Jackson County" vs prose "Jackson"): the five pages must pass before generation starts, because they define the bar.

- [ ] **Step 4: Full check and commit**

Run: `npm run check`
Expected: PASS including the new suite.

```bash
git add scripts/geography/verify-content.mjs tests/locations-content.test.ts src/content/locations
git commit -m "feat: deterministic location-content verifier wired into CI"
```

---

### Task 8: Generation assets (style guide, prompts, briefs)

**Files:**
- Create: `docs/superpowers/generation/style-guide.md`
- Create: `docs/superpowers/generation/writer-prompt.md`
- Create: `docs/superpowers/generation/verifier-prompt.md`
- Create: `scripts/generation/make-briefs.mjs`

**Interfaces:**
- Consumes: geography JSON, `expandDistrict` from `verify-content.mjs`.
- Produces: `.generation/briefs/<tier>/<id>.json` brief files, one per page to generate, each fully self-contained: `{ id, tier, outPath, facts, links, frontmatter }` where `frontmatter` is the exact YAML object the writer must emit and `facts` is the only material the writer may use.

- [ ] **Step 1: Write the style guide**

`docs/superpowers/generation/style-guide.md` distills, with verbatim excerpts, the five existing pages plus the binding rules. Required contents (write each as a section with a positive example from `illinois/chicago.md` or `colorado/denver.md`):
1. Voice: objective, plaintiff-and-defense, written to be read by opposing counsel.
2. Honesty about presence: no street addresses; "by appointment"; never imply a staffed local office; travel framed from the Kansas City home office.
3. Facts: only what the brief provides. Courts always by full expanded name on first mention (use the expansion convention `United States District Court for the Western District of Missouri`). Counties exactly as spelled in the brief.
4. BLS references qualitative only: name the BLS OEWS program and the metro/state area, never numbers.
5. Economist-partner sentence pattern (copy the Denver page's phrasing).
6. CTA: closing section links `/refer-a-case/` with conflict-check language.
7. Hyphens only; no em dashes. No dollar figures, percentages, or counts.
8. Structure per tier (H2 outline):
   - state: venue landscape / how the firm serves the state / qualification and disclosure note ("identified during intake" pattern, no rule citations) / starting an engagement
   - metro: intro + service links / venue footprint (counties, courts) / by-appointment logistics / labor market research / starting an engagement
   - town: intro anchored on the town / county and courthouse context / position in the metro labor market / evaluation logistics for a local evaluee / starting an engagement
9. Length: 500-700 words of body prose.
10. Divergence: each sibling town page must lead with a different angle; the writer receives the list of sibling towns already written for that metro in the brief (`facts.siblingAngles`) and must not reuse an opening angle.

- [ ] **Step 2: Write the brief generator**

```js
// scripts/generation/make-briefs.mjs
// Emits one JSON brief per location page. Usage:
//   node scripts/generation/make-briefs.mjs states
//   node scripts/generation/make-briefs.mjs metros [stateSlug]
//   node scripts/generation/make-briefs.mjs towns <wave-number>
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { expandDistrict } from '../geography/verify-content.mjs';

const geo = (f) => JSON.parse(readFileSync(`src/data/geography/${f}`, 'utf8'));
const states = geo('states.json');
const metros = geo('metros.json');
const towns = geo('towns.json');
const waves = geo('waves.json');
const stateBySlug = new Map(states.map((s) => [s.slug, s]));

const out = (tier, id, brief) => {
  const dir = `.generation/briefs/${tier}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${id.replace(/\//g, '__')}.json`, JSON.stringify(brief, null, 2));
};

const mode = process.argv[2];
if (mode === 'states') {
  for (const s of states) {
    const stateMetros = metros.filter((m) => m.stateSlug === s.slug);
    out('state', s.slug, {
      id: s.slug, tier: 'state', outPath: `src/content/locations/${s.slug}.md`,
      frontmatter: {
        tier: 'state',
        title: `${s.name} Vocational Expert Services`,
        metaDescription: null, // writer supplies, 70-165 chars
        h1: `${s.name} Vocational Expert and Life Care Planning`,
        state: s.name, stateSlug: s.slug,
      },
      facts: {
        state: s.name, trialCourts: s.trialCourts,
        federalDistricts: s.federalDistricts.map((d) => expandDistrict(d, s.name)),
        metros: stateMetros.map((m) => ({ name: m.name, path: `/locations/${m.stateSlug}/${m.slug}/` })),
      },
      links: { referral: '/refer-a-case/', nationwide: '/locations/nationwide/' },
    });
  }
}
if (mode === 'metros') {
  const only = process.argv[3];
  for (const m of metros.filter((m) => !only || m.stateSlug === only)) {
    const s = stateBySlug.get(m.stateSlug);
    out('metro', `${m.stateSlug}/${m.slug}`, {
      id: `${m.stateSlug}/${m.slug}`, tier: 'metro',
      outPath: `src/content/locations/${m.stateSlug}/${m.slug}.md`,
      frontmatter: {
        tier: 'metro',
        title: `${m.principalCity} Vocational Expert Services`,
        metaDescription: null,
        h1: `${m.principalCity} Vocational Expert and Life Care Planning`,
        state: s.name, stateSlug: s.slug, metro: m.name, metroSlug: m.slug,
        counties: m.counties.map((c) => c.name),
      },
      facts: {
        metroName: m.name, principalCity: m.principalCity, kind: m.kind,
        counties: m.counties, trialCourts: s.trialCourts,
        federalDistricts: s.federalDistricts.map((d) => expandDistrict(d, s.name)),
        crossState: new Set(m.counties.map((c) => c.state)).size > 1,
      },
      links: { statePage: `/locations/${s.slug}/`, referral: '/refer-a-case/', nationwide: '/locations/nationwide/' },
    });
  }
}
if (mode === 'towns') {
  const wave = Number(process.argv[3]);
  if (!wave) throw new Error('usage: make-briefs.mjs towns <wave>');
  for (const t of towns.filter((t) => waves[t.stateSlug] === wave)) {
    const s = stateBySlug.get(t.stateSlug);
    const m = metros.find((x) => x.stateSlug === t.metroStateSlug && x.slug === t.metroSlug);
    const siblings = towns.filter((x) => x.metroStateSlug === t.metroStateSlug && x.metroSlug === t.metroSlug && x !== t);
    out('town', `${t.stateSlug}/${t.metroSlug}/${t.slug}`, {
      id: `${t.stateSlug}/${t.metroSlug}/${t.slug}`, tier: 'town',
      outPath: `src/content/locations/${t.stateSlug}/${t.metroSlug}/${t.slug}.md`,
      frontmatter: {
        tier: 'town',
        title: `${t.name}, ${s.abbr} Vocational Expert Services`,
        metaDescription: null,
        h1: `${t.name} Vocational Expert and Life Care Planning`,
        state: s.name, stateSlug: s.slug,
        metro: m.name, metroSlug: m.slug, metroStateSlug: m.stateSlug,
        town: t.name, townSlug: t.slug, county: t.county,
      },
      facts: {
        town: t.name, county: t.county, populationScale: t.population, // scale only: prose says "a community of roughly N residents" is NOT allowed; describe qualitatively (small suburb / large suburb) - populationScale is for the writer's calibration, not for rendering
        metroName: m.name, principalCity: m.principalCity,
        trialCourts: s.trialCourts,
        federalDistricts: s.federalDistricts.map((d) => expandDistrict(d, s.name)),
        siblings: siblings.map((x) => x.name),
      },
      links: {
        metroPage: `/locations/${m.stateSlug}/${m.slug}/`,
        statePage: `/locations/${s.slug}/`,
        referral: '/refer-a-case/', nationwide: '/locations/nationwide/',
      },
    });
  }
}
console.log('briefs written');
```

- [ ] **Step 3: Write the prompt templates**

`writer-prompt.md` (used verbatim as each Workflow writer agent's prompt, with `{{BRIEFS}}` replaced by a JSON array of briefs and `{{STYLE_GUIDE}}` by the style guide contents):

```
You are writing location landing pages for Purinton Analytics, a national
vocational expert and life care planning practice. Write with maximum care:
these pages will be read by opposing counsel.

STYLE GUIDE (binding):
{{STYLE_GUIDE}}

For EACH brief below, write one markdown file:
- Frontmatter: exactly the `frontmatter` object from the brief as YAML, with
  you supplying `metaDescription` (70-165 characters, unique, no em dashes).
- Body: 500-700 words following the tier's H2 outline from the style guide.
- Facts: use ONLY what appears in the brief's `facts` and `links`. Never
  invent a court, county, address, statistic, or place characteristic. If a
  fact is not in the brief, write around it.
- Every page must open with a different first-paragraph angle from its
  sibling pages (`facts.siblings` lists them).
- Include each link from `links` at least once as a markdown link.
- Hyphens only, never an em dash. No dollar amounts, percentages, or counts.

Return each file as:
===FILE: <outPath>===
<file content>
===END===

BRIEFS:
{{BRIEFS}}
```

`verifier-prompt.md` (adversarial reviewer agent per batch):

```
You are an adversarial reviewer for generated landing pages. The
deterministic linter has already passed these files; your job is what a
regex cannot catch. For each file, hunt for:
1. Any factual claim not supported by the brief (invented courthouses,
   local color, employer names, geography, "minutes from downtown" claims).
2. Any implication of a staffed local office or street presence.
3. Economist-opinion attribution to Jason C. Purinton.
4. Template smell: two pages that a reader would recognize as the same
   page with words swapped, openings that repeat an angle, or filler that
   says nothing specific to the place.
5. Tone drift from the style guide (marketing hype, superlatives, keyword
   stuffing).
Report per file: PASS, or FAIL with the exact sentence at issue and why.
Do not rewrite anything.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/generation scripts/generation/make-briefs.mjs
git commit -m "feat: generation style guide, prompts, and brief generator"
```

---

### Task 9: Wave 0 content, part 1: 50 state hubs

**Files:**
- Create: `src/content/locations/<state>.md` x 50
- Modify: `tests/locations.test.ts` (state-tier assertions)

**Interfaces:**
- Consumes: briefs from `make-briefs.mjs states`, prompts from Task 8, Workflow tool with Fable writer agents (standing directive: max effort, inherit model).
- Produces: 50 state markdown files passing verifier + build.

- [ ] **Step 1: Generate briefs**

Run: `node scripts/generation/make-briefs.mjs states`
Expected: 50 files under `.generation/briefs/state/`.

- [ ] **Step 2: Run the generation workflow**

Workflow script shape (author it per the workflow-authoring skill at execution time): batch the 50 briefs into 10 writer agents of 5 pages each (5 pages x ~600 words is a comfortable single-agent output). Pipeline each batch into one adversarial verifier agent using `verifier-prompt.md`. Writer output is parsed by the `===FILE:===` delimiters and written to `outPath`. Any FAIL from the verifier regenerates that page with the verifier's objection appended to the writer prompt (max 2 retries, then surface to the operator).

- [ ] **Step 3: Deterministic verify**

Run: `node scripts/geography/verify-content.mjs`
Expected: OK. Fix by regeneration, not hand-editing, unless the failure is a spelling normalization issue.

- [ ] **Step 4: Add state-tier tests**

Append to `tests/locations.test.ts`:

```ts
import { states as geoStates } from '../src/lib/geography';

describe('state hub pages', () => {
  it('all 50 states build with unique titles and their own court names', () => {
    const titles = new Set<string>();
    for (const s of geoStates()) {
      const html = distFile(`locations/${s.slug}`);
      const title = html.match(/<title>([^<]+)<\/title>/)![1];
      expect(titles.has(title), s.slug).toBe(false);
      titles.add(title);
      expect(mainText(`locations/${s.slug}`)).toContain(s.trialCourts);
    }
  });
  it('locations index links every state', () => {
    const html = distFile('locations');
    for (const s of geoStates()) expect(html, s.slug).toContain(`href="/locations/${s.slug}/"`);
  });
});
```

- [ ] **Step 5: Full check + commit**

Run: `npm run check`
Expected: PASS (~96 pages now).

```bash
git add src/content/locations tests/locations.test.ts
git commit -m "content: 50 state hub pages"
```

---

### Task 10: Wave 0 content, part 2: metro pages + Wave 0 PR

**Files:**
- Create: `src/content/locations/<state>/<metro>.md` for every metro in `metros.json` except the 4 already migrated
- Modify: `tests/locations.test.ts` (metro-tier assertions)

**Interfaces:**
- Consumes: briefs (`make-briefs.mjs metros`), same Workflow shape as Task 9.
- Produces: ~750 metro pages; Wave 0 PR merged to `main`.

- [ ] **Step 1: Branch**

```bash
git checkout -b wave-0-states-metros
```

(If Tasks 1-9 were committed directly to `main` locally, create this branch now so Wave 0 review happens as one PR; if the repo's main is push-protected, all earlier commits should already be on this branch. Executor: check `git branch --show-current` at Task 1 and use `wave-0-states-metros` from the start if pushing to main directly is not allowed.)

- [ ] **Step 2: Generate briefs and run the workflow in state batches**

Run: `node scripts/generation/make-briefs.mjs metros`
Workflow: group briefs by state (50 groups), one writer agent per group writing all that state's metros (max 15 pages; for states with more than 8 metro briefs, split the group in two). Verifier agent per group. Same retry rule. Delete the 4 briefs whose pages already exist (`missouri/kansas-city`, `missouri/st-louis`, `colorado/denver`, `illinois/chicago`) before dispatch:
`rm .generation/briefs/metro/missouri__kansas-city.json .generation/briefs/metro/missouri__st-louis.json .generation/briefs/metro/colorado__denver.json .generation/briefs/metro/illinois__chicago.json`

- [ ] **Step 3: Deterministic verify + metro tests**

Run: `node scripts/geography/verify-content.mjs`
Append to `tests/locations.test.ts`:

```ts
import { metros as geoMetros } from '../src/lib/geography';

describe('metro pages', () => {
  it('every metro builds and names its first county', () => {
    for (const m of geoMetros()) {
      const text = mainText(`locations/${m.stateSlug}/${m.slug}`);
      expect(text, `${m.stateSlug}/${m.slug}`).toContain(m.counties[0].name);
    }
  });
  it('every state hub links each of its metros', () => {
    for (const m of geoMetros()) {
      expect(distFile(`locations/${m.stateSlug}`), m.slug).toContain(`href="/locations/${m.stateSlug}/${m.slug}/"`);
    }
  });
});
```

- [ ] **Step 4: Full check**

Run: `npm run check`
Expected: PASS, ~850 pages. Note the build duration in the PR description (baseline for the town waves).

- [ ] **Step 5: Docker smoke test**

```bash
docker build -t pa-website . && docker run -d -p 8090:8090 -e PORT=8090 --name pa-web-w0 pa-website
curl -sf http://localhost:8090/locations/missouri/kansas-city/ | grep -q 'Kansas City' && echo SMOKE-OK
curl -sf http://localhost:8090/sitemap.xml | grep -q sitemapindex && echo SITEMAP-OK
docker rm -f pa-web-w0
```

- [ ] **Step 6: Push and open Wave 0 PR, then merge**

```bash
git push -u origin wave-0-states-metros
gh pr create --title "Wave 0: geography layer, 50 state hubs, ~750 metro pages" \
  --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-08-31-locations-expansion-design.md Wave 0.
- Geography data layer (states/metros/towns/waves JSON) + typed accessors
- Hierarchical /locations/[state]/[metro]/ routes; 5 legacy pages migrated
- Sitemap index + per-state sitemaps
- Deterministic content verifier in CI
- 50 state hubs + ~750 metro pages, full-depth prose
Merge now; Waves 1-8 (town pages) follow as scheduled PRs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --squash --auto || true  # if branch protection requires review, leave for Chris
```

If auto-merge is unavailable and Chris's review is not required by protection rules, merge with `gh pr merge --squash`; otherwise stop and tell Chris the PR is ready.

---

### Task 11: Waves 1-8: town pages as staged PRs

**Files (per wave N):**
- Create: `src/content/locations/<state>/<metro>/<town>.md` for every town whose state is in wave N

**Interfaces:**
- Consumes: `waves.json`, briefs (`make-briefs.mjs towns N`), Workflow as before.
- Produces: 8 open PRs, branch names `wave-N-towns`, each labeled with its merge week, none merged now.

- [ ] **Step 1: For each wave N in 1..8, run this cycle**

```bash
git checkout main && git pull
git checkout -b wave-N-towns
node scripts/generation/make-briefs.mjs towns N
# Workflow: writer agents grouped by metro (each metro's ~10 towns = one
# writer, so sibling-angle divergence is enforced inside one context),
# verifier agent per state. Same 2-retry rule.
node scripts/geography/verify-content.mjs
npm run check
docker build -t pa-website . && docker run -d -p 8090:8090 -e PORT=8090 --name pa-web-wN pa-website
# curl two sample town URLs from this wave, expect 200 + town name; then:
docker rm -f pa-web-wN
git add src/content/locations
git commit -m "content: wave N town pages"
git push -u origin wave-N-towns
gh pr create --title "Wave N towns (merge week of <DATE>)" --body "<states + page count + checklist>"
```

Fill `<DATE>` as: Wave 1 = 2026-09-08, then +7 days per wave through Wave 8 = 2026-10-26. PR body checklist (paste in each):

```
Scheduled merge: week of <DATE>. Do not merge early.
States: <list>  Pages: <count>
Pre-merge: rebase not needed (files disjoint); confirm `npm run check` green on branch.
Post-merge: deploy, then ping https://purintonanalytics.com/sitemap.xml in GSC,
watch Search Console coverage for the previous wave's states before the next merge.
Hold rule (spec): if GSC shows the locations section being suppressed or
mass-excluded, hold remaining wave PRs.
```

- [ ] **Step 2: Branch hygiene for parallel waves**

Each wave branch is cut from `main` (which contains only Wave 0), so wave branches never contain each other's files; the `locations-content` similarity suite on a wave branch checks that wave's towns against Wave 0 content plus its own files, and the within-metro pairwise check runs fully inside each branch because a metro's towns never straddle waves (waves are per-state). Cross-wave random-sample similarity across two unmerged branches is deliberately not checked; the post-merge `npm run check` on `main` after each weekly merge covers it incrementally. Add this line to each PR body's post-merge checklist: "run `npm run check` on main after merge".

- [ ] **Step 3: Verify all 8 PRs exist**

Run: `gh pr list --state open`
Expected: 8 open PRs, wave-1 through wave-8, each with a merge-week title.

---

### Task 12: Docs, checklist, and memory

**Files:**
- Modify: `CLAUDE.md` (locations rules addendum)
- Modify: `LAUNCH-CHECKLIST.md` (wave merge calendar)
- Modify: `README.md` (page-count and structure notes)

- [ ] **Step 1: CLAUDE.md addendum**

Append a "Locations at scale" section: geography JSON is the only source of location facts; `verify-content.mjs` must pass before committing location content; wave PRs merge weekly per LAUNCH-CHECKLIST; never add the neutrality statement to state/metro/town pages; town pages never render population numbers.

- [ ] **Step 2: LAUNCH-CHECKLIST.md**

Add a "Locations rollout calendar" section listing Wave 0 (merged) and Waves 1-8 with dates and PR numbers, plus the hold rule and the GSC sitemap-ping step per wave.

- [ ] **Step 3: Commit and push**

```bash
git checkout main && git pull
git add CLAUDE.md LAUNCH-CHECKLIST.md README.md
git commit -m "docs: locations-at-scale rules and wave rollout calendar"
git push
```

- [ ] **Step 4: Update session memory**

Update `~/.claude/projects/-Users-chrisskerritt/memory/project_pa_website_national_build.md` and its MEMORY.md line: locations expansion shipped Wave 0 (~850 pages), 8 town-wave PRs open with merge calendar, hold rule, and the "PR is the gate" mechanism.

---

## Self-review notes

- Spec coverage: data layer (Tasks 1-4), URL architecture + migration (5), sitemap index (6), verifier/tests (7), generation pipeline (8-11), staged PRs (10-11), docs/hold rule (11-12). Similarity, fact-grounding, uniqueness, and neutrality-placement tests: Tasks 4-7 and 9-10. No publish flag anywhere: content presence gates pages, per the approved amendment.
- The spec's "town pages mention population scale" is implemented as qualitative-only (brief carries the number for calibration; verifier's `numeric-claim` rule plus the style guide ban rendering it). This is a deliberate tightening to avoid stale Census figures in prose.
- Build-time risk: ~850 pages at Wave 0, ~8,300 by Wave 8. If `astro build` exceeds acceptable time in later waves, address then (spec: build tooling, never skipping `npm run check`).
- Wave-0 branch note in Task 10 Step 1 resolves the main-vs-branch ambiguity for Tasks 1-9.
