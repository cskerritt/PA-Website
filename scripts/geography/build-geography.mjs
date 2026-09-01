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
console.log(`states: ${STATES.length}, metros: ${metros.length}`);
