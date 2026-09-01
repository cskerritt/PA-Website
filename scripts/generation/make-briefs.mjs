// scripts/generation/make-briefs.mjs
// Emits one JSON brief per location page into .generation/briefs/<tier>/
// (gitignored). Each brief is fully self-contained:
//   { id, tier, outPath, facts, links, frontmatter }
// where `frontmatter` is the exact YAML object the writer must emit
// (adding only metaDescription) and `facts` is the only material the
// writer may use. The hub page (nationwide.md) already exists and is
// never generated.
//
// Usage:
//   node scripts/generation/make-briefs.mjs states
//   node scripts/generation/make-briefs.mjs metros [stateSlug]
//   node scripts/generation/make-briefs.mjs towns <wave-number>
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { expandDistrict } from '../geography/verify-content.mjs';

const USAGE = `usage: node scripts/generation/make-briefs.mjs <mode>
  states             one brief per state (50)
  metros [stateSlug] one brief per metro, optionally for a single state
  towns <wave>       one brief per town whose state is in the given wave`;

const fail = (msg) => {
  console.error(msg);
  console.error(USAGE);
  process.exit(1);
};

const geo = (f) => JSON.parse(readFileSync(`src/data/geography/${f}`, 'utf8'));
const states = geo('states.json');
const metros = geo('metros.json');
const towns = geo('towns.json');
const waves = geo('waves.json');
const stateBySlug = new Map(states.map((s) => [s.slug, s]));

let written = 0;
const out = (tier, id, brief) => {
  const dir = `.generation/briefs/${tier}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${id.replace(/\//g, '__')}.json`, JSON.stringify(brief, null, 2));
  written += 1;
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
} else if (mode === 'metros') {
  const only = process.argv[3];
  if (only && !stateBySlug.has(only)) fail(`unknown stateSlug: ${only}`);
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
        // County records keep both fields ({ name, state }) so the writer can
        // ground cross-state clarity like "Johnson County, Kansas".
        counties: m.counties, trialCourts: s.trialCourts,
        federalDistricts: s.federalDistricts.map((d) => expandDistrict(d, s.name)),
        crossState: new Set(m.counties.map((c) => c.state)).size > 1,
      },
      links: { statePage: `/locations/${s.slug}/`, referral: '/refer-a-case/', nationwide: '/locations/nationwide/' },
    });
  }
} else if (mode === 'towns') {
  const wave = Number(process.argv[3]);
  if (!Number.isInteger(wave) || wave < 1) fail('towns mode requires a wave number');
  for (const t of towns.filter((t) => waves[t.stateSlug] === wave)) {
    const s = stateBySlug.get(t.stateSlug);
    const m = metros.find((x) => x.stateSlug === t.metroStateSlug && x.slug === t.metroSlug);
    if (!s || !m) fail(`geography integrity: town ${t.stateSlug}/${t.slug} has no ${s ? 'metro' : 'state'} record`);
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
        // metroStateSlug is the parent metro PAGE's stateSlug (m.stateSlug),
        // which differs from the town's own stateSlug in cross-state metros.
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
} else {
  fail(mode ? `unknown mode: ${mode}` : 'missing mode');
}
console.log(`${written} briefs written (${mode})`);
