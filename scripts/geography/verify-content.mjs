// scripts/geography/verify-content.mjs
// Deterministic gate for generated location prose. Also imported by the
// vitest suite (tests/locations-content.test.ts) so CI and the generation
// pipeline enforce identical rules.
//
// CLI: node scripts/geography/verify-content.mjs [files...]
// Prints "rule: file :: detail" lines to stderr, then "OK" or "N problems",
// and exits 0/1. Run from the repo root (paths below are root-relative).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'src/content/locations';
const geo = (f) => JSON.parse(readFileSync(`src/data/geography/${f}`, 'utf8'));

// Each entry is [regex, rule]. The em dash regex is written with unicode
// escapes and entity strings (never the literal character) so this file
// itself stays em-dash-free per the repo rule.
const BANNED = [
  [/\u2014|&mdash;|&#8212;/u, 'em-dash'],
  [/Schedule a Consultation/i, 'banned-phrase'],
  [/LocalBusiness/, 'banned-phrase'],
  [/231 S\.? Bemiston/i, 'banned-phrase'],
  // Street address formations (offices are by appointment, address null).
  // Trailing (?![A-Za-z]) instead of \b so the "St." / "Ave." / "Blvd."
  // alternatives (which end in a non-word char) still terminate the match.
  [/\b\d{2,5}\s+[A-Z][a-z]+ (Street|St\.|Avenue|Ave\.|Boulevard|Blvd\.|Suite)(?![A-Za-z])/, 'banned-phrase'],
];

// First eight words of SITE.neutralityStatement (see src/config/site.ts).
// The statement is rendered by the location page component, never written
// into location markdown bodies; if it shows up in a body it would render
// twice on the page.
const NEUTRALITY_FIRST_WORDS = 'Purinton Analytics accepts engagements from both plaintiff and';

// A county mention is a run of capitalized tokens ending in "County"
// (e.g. "Jackson County", "St. Clair County", "Miami-Dade County").
// Tokens must each start with a capital letter so list prose like
// "Circuit Court of Cook County" or "the City and County of Denver"
// resolves to the county name only (or to no match). Only this "X County"
// formation is checked; lowercase forms ("Jackson and Clay counties")
// are out of contract.
const COUNTY_RE = /\b([A-Z][A-Za-z.'-]*(?: [A-Z][A-Za-z.'-]*)* County)\b/g;

// A federal-district mention is "District of <Capitalized State Name>".
// The name is a run of capitalized words so prose like "the Western
// District of Missouri and the District of Kansas" yields two exact
// mentions instead of one greedy over-capture.
const DISTRICT_RE = /\bDistrict of [A-Z][a-z]+(?: [A-Z][a-z]+)*/g;

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
  return out.sort();
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
  const countyNames = new Set(metrosData.flatMap((m) => m.counties.map((c) => c.name)));
  const docs = [];

  for (const file of all) {
    const rel = relative(ROOT, file).replace(/\.md$/, '');
    const src = readFileSync(file, 'utf8');
    const { fm, body } = parseFm(src);
    // Markdown prose is hard-wrapped, so a banned phrase or a county or
    // district mention can span a line break. Phrase-level rules run on
    // whitespace-normalized text so wrapping cannot hide a violation.
    const flatSrc = src.replace(/\s+/g, ' ');
    const flatBody = body.replace(/\s+/g, ' ');
    for (const [re, rule] of BANNED) {
      if (re.test(flatSrc)) problems.push({ file, rule, detail: String(re) });
    }
    // Neutrality statement must never appear in location markdown bodies
    // (the component renders it where required, including on the hub).
    if (flatBody.toLowerCase().includes(NEUTRALITY_FIRST_WORDS.toLowerCase())) {
      problems.push({ file, rule: 'neutrality-misplaced', detail: 'body contains SITE.neutralityStatement text' });
    }
    // Fabrication guards: any "X County" or "District of X" mentioned must be known.
    for (const m of flatBody.matchAll(COUNTY_RE)) {
      if (!countyNames.has(m[1])) problems.push({ file, rule: 'fabricated-county', detail: m[1] });
    }
    for (const m of flatBody.matchAll(DISTRICT_RE)) {
      const known = states.some((s) => s.federalDistricts.some((d) => expandDistrict(d, s.name).includes(m[0])));
      if (!known) problems.push({ file, rule: 'fabricated-court', detail: m[0] });
    }
    // Numeric hygiene: no dollar figures or percentages in prose.
    if (/\$\d|\b\d+(\.\d+)?\s*(%|percent)\b/.test(flatBody)) {
      problems.push({ file, rule: 'numeric-claim', detail: 'dollar/percent figure in prose' });
    }
    // Length floor for full-depth prose (frontmatter excluded).
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const tier = /(^|\n)tier:\s*(\w+)/.exec(fm)?.[2] ?? 'unknown';
    const floor = tier === 'hub' ? 300 : 450;
    if (wordCount < floor) problems.push({ file, rule: 'length', detail: `${wordCount} words (< ${floor})` });
    // Frontmatter path agreement. Handles quoted and unquoted YAML scalars.
    const get = (k) => {
      const m = new RegExp(`(^|\\n)${k}:[ \\t]*(.+)`).exec(fm);
      if (!m) return undefined;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"') && v.length > 1) || (v.startsWith("'") && v.endsWith("'") && v.length > 1)) {
        v = v.slice(1, -1);
      }
      return v;
    };
    if (tier === 'state' && rel !== get('stateSlug')) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    if (tier === 'metro' && rel !== `${get('stateSlug')}/${get('metroSlug')}`) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    if (tier === 'town' && rel !== `${get('stateSlug')}/${get('metroSlug')}/${get('townSlug')}`) problems.push({ file, rule: 'frontmatter-path-mismatch', detail: rel });
    // Similarity grouping key: town pages carry metroStateSlug/metroSlug;
    // metro pages belong to their own metro's group via stateSlug/metroSlug.
    const metroKey = tier === 'metro'
      ? `${get('stateSlug')}/${get('metroSlug')}`
      : (get('metroStateSlug') ? `${get('metroStateSlug')}/${get('metroSlug')}` : null);
    docs.push({ file, rel, tier, grams: fiveGrams(body), metroKey });
  }

  // Similarity: all pairs within a metro, plus a seeded random national sample.
  const byMetro = new Map();
  for (const d of docs) {
    if (!d.metroKey) continue;
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2);
  const res = verifyLocationContent(files.length ? files : undefined);
  for (const p of res.problems) console.error(`${p.rule}: ${p.file} :: ${p.detail}`);
  console.log(res.ok ? 'OK' : `${res.problems.length} problems`);
  process.exit(res.ok ? 0 : 1);
}
