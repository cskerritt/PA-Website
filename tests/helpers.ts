import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';

const DIST = join(process.cwd(), 'dist');

export function distFile(path: string): string {
  const p = /\.[a-z]+$/.test(path) ? join(DIST, path) : join(DIST, path, 'index.html');
  if (!existsSync(p)) throw new Error(`missing dist file for ${path}`);
  return readFileSync(p, 'utf8');
}

export function parseDist(path: string): HTMLElement {
  return parse(distFile(path));
}

export function jsonld(path: string): any[] {
  return parseDist(path)
    .querySelectorAll('script[type="application/ld+json"]')
    .map((s) => JSON.parse(s.text));
}
