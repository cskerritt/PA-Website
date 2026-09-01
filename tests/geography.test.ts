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
