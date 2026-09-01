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
