import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Content-hash version for a file under public/, as a ?v= query suffix.
 * public/ files are served with a 1-hour cache and no fingerprinted name
 * (unlike /_astro/*), so without this a deploy can leave returning
 * visitors on stale JS for up to an hour.
 */
export function assetVer(publicPath: string): string {
  const file = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
  return createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);
}
