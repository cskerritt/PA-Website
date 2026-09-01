// scripts/geography/build-geography.mjs
// One-time builder for src/data/geography/*.json. Downloads Census inputs
// into .generation/census/ (gitignored) and emits deterministic JSON.
//
// Sources (verified 2026-09-01):
// - CBSA delineation: list1_2023.xlsx (OMB July 2023 delineations). Sheet
//   "List 1", header on row index 2, columns: "CBSA Code", "CBSA Title",
//   "Metropolitan/Micropolitan Statistical Area", "County/County Equivalent",
//   "State Name" (plus division/CSA/FIPS columns we do not use). Two note
//   rows trail the data; they carry text in column A only, so rows are kept
//   only when both "CBSA Code" and "CBSA Title" are present.
// - CBSA population: the brief's cbsa-est2024.csv URL 404s; the same
//   Vintage 2024 data ships as cbsa-est2024-alldata.csv (only the filename
//   differs), which is what we fetch. It mixes CBSA, metropolitan division,
//   and county rows; the LSAD column distinguishes them. Puerto Rico CBSAs
//   are in a separate prc- file and are out of scope anyway.
// - Place population: sub-est2024.csv (Vintage 2024 city/town estimates).
//   Columns: SUMLEV,STATE,COUNTY,PLACE,COUSUB,CONCIT,PRIMGEO_FLAG,FUNCSTAT,
//   NAME,STNAME,ESTIMATESBASE2020,POPESTIMATE2020..POPESTIMATE2024. SUMLEV
//   162 = incorporated place (canonical population; its COUNTY field is
//   000), SUMLEV 157 = the place's part within one county. This vintage has
//   no county-name column, so county names come from joining STATE+COUNTY
//   FIPS against the delineation file's county list (which also resolves
//   Connecticut planning-region equivalents, since both files share the
//   same FIPS in matching vintages).
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as XLSX from 'xlsx';
import { STATES } from './states-table.mjs';

const CACHE = '.generation/census';
const OUT = 'src/data/geography';
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const SOURCES = {
  delineation:
    'https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx',
  cbsaPop:
    'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/metro/totals/cbsa-est2024-alldata.csv',
  placePop:
    'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv',
};

function fetchCached(url, file) {
  const path = `${CACHE}/${file}`;
  if (!existsSync(path)) execFileSync('curl', ['-fsSL', '-o', path, url], { stdio: 'inherit' });
  return path;
}

// RFC-4180-style CSV line parser: quoted fields may contain commas, and a
// doubled quote inside a quoted field is a literal quote.
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const stateByName = new Map(STATES.map((s) => [s.name, s]));
const stateByAbbr = new Map(STATES.map((s) => [s.abbr, s]));

// Principal city: the first city named in the CBSA title. Census titles
// separate multiple principal cities with "-", but switch to "--" when a
// city's own name contains a hyphen (e.g. "Scranton--Wilkes-Barre, PA"),
// and Louisville uses a slash ("Louisville/Jefferson County, KY-IN").
// Single-city titles whose city name contains a hyphen (no "--" present)
// cannot be told apart from multi-city titles, so they are listed
// explicitly. New England titles carry a " Town" suffix ("Barnstable Town,
// MA") which is Census styling, not part of the place name.
const HYPHENATED_SINGLE_CITIES = new Set(['Winston-Salem']);

function principalCityOf(title) {
  const cityPart = title.split(',')[0];
  const first = cityPart.split('--')[0].split('/')[0].trim();
  const city = HYPHENATED_SINGLE_CITIES.has(first) ? first : first.split('-')[0].trim();
  return city.replace(/ Town$/, '');
}

// --- states.json (straight from the table) ---
writeFileSync(`${OUT}/states.json`, JSON.stringify(STATES, null, 2) + '\n');

// --- metros.json ---
const wb = XLSX.read(readFileSync(fetchCached(SOURCES.delineation, 'list1.xlsx')));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 2 });
// Group delineation rows by CBSA code, skipping the trailing note rows.
const byCbsa = new Map();
for (const r of rows) {
  if (!r['CBSA Code'] || !r['CBSA Title']) continue;
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
if (byCbsa.size < 900 || byCbsa.size > 1000) {
  throw new Error(`unexpected CBSA count in delineation file: ${byCbsa.size}`);
}

// CBSA populations. The alldata CSV columns: CBSA, MDIV, STCOU, NAME, LSAD,
// ESTIMATESBASE2020, POPESTIMATE2020..POPESTIMATE2024, ... NAME is quoted
// and contains commas, hence the real CSV parse above.
const popCsv = readFileSync(fetchCached(SOURCES.cbsaPop, 'cbsa-pop.csv'), 'latin1');
const popLines = popCsv.split(/\r?\n/).filter((l) => l.length > 0);
const popHeader = parseCsvLine(popLines[0]);
const col = (name) => {
  const i = popHeader.indexOf(name);
  if (i === -1) throw new Error(`missing column ${name} in cbsa-pop.csv`);
  return i;
};
const CBSA_COL = col('CBSA');
const LSAD_COL = col('LSAD');
const POP_COL = col('POPESTIMATE2024');
const popByCbsa = new Map();
for (const line of popLines.slice(1)) {
  const cols = parseCsvLine(line);
  const lsad = cols[LSAD_COL];
  if (lsad !== 'Metropolitan Statistical Area' && lsad !== 'Micropolitan Statistical Area') continue;
  popByCbsa.set(cols[CBSA_COL], Number(cols[POP_COL]));
}
if (popByCbsa.size < 900) {
  throw new Error(`unexpected CBSA count in population file: ${popByCbsa.size}`);
}

// Non-state county equivalents keep a consistent two-letter code.
const EXTRA_COUNTY_STATE_ABBRS = new Map([['District of Columbia', 'DC']]);

// Assign each CBSA to the first state in its title (largest component by
// Census convention). If that abbreviation is not one of the 50 states
// (only DC leads any such title), fall back to the next abbreviation in
// the title's list that is (so "Washington-Arlington-Alexandria,
// DC-VA-MD-WV" lands under Virginia). Titles with no 50-state
// abbreviation at all (Puerto Rico) are skipped. Rank within state,
// keep top 15.
const metrosByState = new Map(STATES.map((s) => [s.slug, []]));
for (const [code, m] of byCbsa) {
  const title = m.title; // e.g. "Kansas City, MO-KS"
  const abbrs = title.split(',').pop().trim().split('-');
  const st = abbrs.map((a) => stateByAbbr.get(a)).find(Boolean);
  if (!st) continue; // PR CBSAs are out of scope
  const principalCity = principalCityOf(title);
  metrosByState.get(st.slug).push({
    cbsa: code,
    name: title,
    slug: slugify(principalCity),
    stateSlug: st.slug,
    principalCity,
    kind: m.kind,
    counties: m.counties.map((c) => ({
      name: c.name,
      state: stateByName.get(c.state)?.abbr ?? EXTRA_COUNTY_STATE_ABBRS.get(c.state) ?? c.state,
    })),
    population: popByCbsa.get(code) ?? 0,
  });
}
const metros = [];
for (const [, list] of metrosByState) {
  list.sort((a, b) => b.population - a.population || a.cbsa.localeCompare(b.cbsa));
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
metros.sort(
  (a, b) =>
    a.stateSlug.localeCompare(b.stateSlug) ||
    b.population - a.population ||
    a.cbsa.localeCompare(b.cbsa),
);

// Sanity checks.
const kc = metros.find((m) => m.slug === 'kansas-city' && m.stateSlug === 'missouri');
if (!kc) throw new Error('KC sanity check failed');
if (kc.principalCity !== 'Kansas City' || !kc.population) {
  throw new Error('KC record malformed');
}
const dc = metros.find((m) => m.name.startsWith('Washington-Arlington') && m.stateSlug === 'virginia');
if (!dc) throw new Error('Washington DC metro sanity check failed');
const zeroPop = metros.filter((m) => !m.population);
if (zeroPop.length > 0) {
  throw new Error(`metros with no population: ${zeroPop.map((m) => m.name).join('; ')}`);
}

writeFileSync(`${OUT}/metros.json`, JSON.stringify(metros, null, 2) + '\n');

// --- towns.json ---
// County lookup by FIPS from the delineation rows: "SSCCC" -> county name
// and CBSA code. Counties belong to exactly one CBSA.
const countyByFips = new Map();
for (const r of rows) {
  if (!r['CBSA Code'] || !r['CBSA Title']) continue;
  const key =
    String(r['FIPS State Code']).padStart(2, '0') + String(r['FIPS County Code']).padStart(3, '0');
  countyByFips.set(key, { name: r['County/County Equivalent'], cbsa: String(r['CBSA Code']) });
}

// Only metros that made the per-state top-15 cut get town pages.
const metroByCbsa = new Map(metros.map((m) => [m.cbsa, m]));

// Census place names carry a legal-description suffix ("Overland Park
// city", "Carmel town (balance)") and consolidated city-county governments
// carry compound names ("Augusta-Richmond County consolidated government
// (balance)", "Louisville/Jefferson County metro government (balance)",
// "Lynchburg, Moore County metropolitan government"). Normalize to the
// common city name so the principal-city exclusion below matches.
const CONSOLIDATED_RENAMES = new Map([
  ['Nashville-Davidson', 'Nashville'],
  ['Lexington-Fayette', 'Lexington'],
  ['Butte-Silver Bow', 'Butte'],
]);
function cleanPlaceName(raw, stateName) {
  let n = raw.replace(/ \(balance\)$/, '');
  n = n.replace(
    / (city|town|village|borough|CDP|municipality|corporation|metro township|metro government|metropolitan government|unified government|consolidated government|urban county)$/i,
    '',
  );
  // Massachusetts consolidated town-cities are styled "X Town city"
  // ("Barnstable Town city"); the " Town" is Census styling, not the name.
  // Only MA uses this styling; "Old Town city" (ME), "Charles Town city"
  // (WV), and "New Town city" (ND) are real names and keep their Town.
  if (stateName === 'Massachusetts') n = n.replace(/ Town$/, '');
  if (n.includes(',')) n = n.split(',')[0]; // "Islamorada, Village of Islands"
  const cc = n.match(/^(.+?)[-/][^-/]+ County$/); // "Macon-Bibb County" -> "Macon"
  if (cc) n = cc[1];
  return CONSOLIDATED_RENAMES.get(n) ?? n;
}

const placeCsv = readFileSync(fetchCached(SOURCES.placePop, 'place-pop.csv'), 'latin1');
const placeLines = placeCsv.split(/\r?\n/).filter((l) => l.length > 0);
const placeHeader = parseCsvLine(placeLines[0]);
const pcol = (name) => {
  const i = placeHeader.indexOf(name);
  if (i === -1) throw new Error(`missing column ${name} in place-pop.csv`);
  return i;
};
const P_SUMLEV = pcol('SUMLEV');
const P_STATE = pcol('STATE');
const P_COUNTY = pcol('COUNTY');
const P_PLACE = pcol('PLACE');
const P_NAME = pcol('NAME');
const P_STNAME = pcol('STNAME');
const P_POP = pcol('POPESTIMATE2024');

const places = new Map(); // key: STATE fips + PLACE fips
for (const line of placeLines.slice(1)) {
  const c = parseCsvLine(line);
  if (c[P_SUMLEV] !== '162') continue;
  places.set(c[P_STATE] + c[P_PLACE], {
    name: cleanPlaceName(c[P_NAME], c[P_STNAME]),
    stateName: c[P_STNAME],
    population: Number(c[P_POP]),
    countyParts: [],
  });
}
for (const line of placeLines.slice(1)) {
  const c = parseCsvLine(line);
  if (c[P_SUMLEV] !== '157') continue;
  const p = places.get(c[P_STATE] + c[P_PLACE]);
  if (p) p.countyParts.push({ fips: c[P_STATE] + c[P_COUNTY], pop: Number(c[P_POP]) });
}

// District of Columbia places are excluded by construction: STNAME
// "District of Columbia" is not in the 50-state table, so stateByName
// misses and the row is skipped. The Washington metro page itself lives
// under Virginia; its MD/VA/WV suburbs qualify through their own states.
const towns = [];
for (const p of places.values()) {
  const st = stateByName.get(p.stateName);
  if (!st || p.population < 2500) continue;
  // Assign the place to the county holding its largest part.
  const top = p.countyParts.sort((a, b) => b.pop - a.pop || a.fips.localeCompare(b.fips))[0];
  if (!top) continue;
  const county = countyByFips.get(top.fips);
  if (!county) continue; // county is outside every CBSA
  const metro = metroByCbsa.get(county.cbsa);
  if (!metro) continue; // CBSA did not make the per-state top 15
  const slug = slugify(p.name);
  if (slug === metro.slug && st.slug === metro.stateSlug) continue; // principal city = metro page
  towns.push({
    name: p.name,
    slug,
    stateSlug: st.slug,
    metroSlug: metro.slug,
    metroStateSlug: metro.stateSlug,
    county: county.name,
    population: p.population,
  });
}

// Top 10 per metro; dedupe slug collisions inside a metro with a county
// suffix.
const byMetro = new Map();
for (const t of towns) {
  const k = `${t.metroStateSlug}/${t.metroSlug}`;
  if (!byMetro.has(k)) byMetro.set(k, []);
  byMetro.get(k).push(t);
}
const kept = [];
for (const list of byMetro.values()) {
  list.sort(
    (a, b) => b.population - a.population || a.stateSlug.localeCompare(b.stateSlug) || a.slug.localeCompare(b.slug),
  );
  const picked = list.slice(0, 10);
  const seen = new Set();
  for (const t of picked) {
    if (seen.has(`${t.stateSlug}/${t.slug}`)) t.slug = `${t.slug}-${slugify(t.county)}`;
    seen.add(`${t.stateSlug}/${t.slug}`);
    kept.push(t);
  }
}
kept.sort(
  (a, b) =>
    a.stateSlug.localeCompare(b.stateSlug) ||
    b.population - a.population ||
    a.slug.localeCompare(b.slug) ||
    a.metroSlug.localeCompare(b.metroSlug),
);

// Sanity checks.
const op = kept.find((t) => t.slug === 'overland-park');
if (
  !op ||
  op.stateSlug !== 'kansas' ||
  op.metroSlug !== 'kansas-city' ||
  op.metroStateSlug !== 'missouri' ||
  op.county !== 'Johnson County'
) {
  throw new Error(`Overland Park sanity check failed: ${JSON.stringify(op)}`);
}
// The brief predicted 5,000-7,500 towns, assuming ~10 qualifying towns per
// metro. Reality: most of the 585 metros are micropolitan with only a few
// non-principal places at or above the 2,500 floor, so the binding rules
// (floor 2500, top 10 per metro, principal-city exclusion) yield ~2,250.
// Measured sweep at floor 2500: cap 10 -> 2,248; cap 15 -> 2,665; uncapped
// -> 4,875. The range below reflects reality under the binding rules.
if (kept.length < 2000 || kept.length > 3000) {
  throw new Error(`unexpected town count: ${kept.length}`);
}
if (!kept.some((t) => t.stateSlug === 'connecticut')) {
  throw new Error('no Connecticut towns survived (planning-region FIPS join broke)');
}
const orphanTowns = kept.filter(
  (t) => !metros.some((m) => m.slug === t.metroSlug && m.stateSlug === t.metroStateSlug),
);
if (orphanTowns.length > 0) {
  throw new Error(`towns pointing at missing metros: ${orphanTowns.length}`);
}

writeFileSync(`${OUT}/towns.json`, JSON.stringify(kept, null, 2) + '\n');

// --- waves.json: 8 waves, litigation-heavy states first, balanced by town
// count ---
const PRIORITY = ['california', 'texas', 'florida', 'new-york', 'pennsylvania', 'illinois', 'ohio', 'georgia', 'north-carolina', 'michigan', 'new-jersey', 'missouri', 'washington', 'massachusetts', 'colorado'];
const countByState = new Map();
for (const t of kept) countByState.set(t.stateSlug, (countByState.get(t.stateSlug) ?? 0) + 1);
const order = [...countByState.keys()].sort((a, b) => {
  const pa = PRIORITY.indexOf(a), pb = PRIORITY.indexOf(b);
  if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  return (countByState.get(b) ?? 0) - (countByState.get(a) ?? 0) || a.localeCompare(b);
});
// Walk states in order and fill each wave to a per-wave town budget so
// priority states always land in the earliest waves. The budget is
// recomputed from the remaining towns at each wave boundary; a fixed
// ceil(total/8) budget would dump every leftover state into wave 8
// (measured: 485 pages vs ~250 in waves 1-7).
const waves = {};
let remaining = kept.length;
let wave = 1, load = 0, budget = Math.ceil(remaining / 8);
for (const s of order) {
  const n = countByState.get(s);
  if (load + n > budget && wave < 8) {
    wave += 1;
    load = 0;
    budget = Math.ceil(remaining / (9 - wave));
  }
  waves[s] = wave;
  load += n;
  remaining -= n;
}
const waveNumbers = new Set(Object.values(waves));
for (let w = 1; w <= 8; w++) {
  if (!waveNumbers.has(w)) throw new Error(`wave ${w} is empty`);
}
if ([...waveNumbers].some((w) => w < 1 || w > 8)) {
  throw new Error('wave number out of 1..8 range');
}
writeFileSync(`${OUT}/waves.json`, JSON.stringify(waves, null, 2) + '\n');
console.log(`states: ${STATES.length}, metros: ${metros.length}, towns: ${kept.length}, waves: ${waveNumbers.size}`);
