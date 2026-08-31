import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';

/**
 * Site-wide invariant suite (plan Task 12): walks every built HTML page in
 * dist/ and enforces the 12 publication invariants from the spec. Content
 * pages, indexes, policies, the referral funnel, and the 404 page are all in
 * scope; page-specific behavior lives in the per-cluster test files.
 */

const DIST = join(process.cwd(), 'dist');

/** All built HTML files, dist-relative with forward slashes (includes 404.html). */
const FILES = (readdirSync(DIST, { recursive: true }) as string[])
  .map((p) => p.split(sep).join('/'))
  .filter((p) => p.endsWith('.html'))
  .sort();

/** The route a dist file serves ('/404.html' for the error page). */
function routeOf(file: string): string {
  return file.endsWith('/index.html') || file === 'index.html'
    ? `/${file.replace(/index\.html$/, '')}`
    : `/${file}`;
}

const rawCache = new Map<string, string>();
function raw(file: string): string {
  let html = rawCache.get(file);
  if (html === undefined) {
    html = readFileSync(join(DIST, file), 'utf8');
    rawCache.set(file, html);
  }
  return html;
}

function doc(file: string): HTMLElement {
  return parse(raw(file));
}

/** Astro escapes entities in rendered text; normalize for comparisons. */
function norm(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—') // entity-encoded em dashes render as em dashes
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** Serialized page with every <script> body removed (JSON-LD included); attributes kept. */
function renderedOutput(file: string): string {
  const d = doc(file);
  d.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
  return norm(d.toString());
}

it('walks a full build (sanity check on the dist walker)', () => {
  expect(FILES.length).toBeGreaterThanOrEqual(40);
  expect(FILES).toContain('index.html');
  expect(FILES).toContain('404.html');
});

describe('1. exactly one H1 per page', () => {
  it.each(FILES)('%s', (file) => {
    expect(doc(file).querySelectorAll('h1').length).toBe(1);
  });
});

describe('2. titles are unique site-wide and at most 70 characters', () => {
  it('every page has a distinct, bounded title', () => {
    const seen = new Map<string, string>();
    for (const file of FILES) {
      const title = norm(doc(file).querySelector('title')?.text ?? '').trim();
      expect(title.length, `${file} has no title`).toBeGreaterThan(0);
      expect(title.length, `${file} title too long: ${title}`).toBeLessThanOrEqual(70);
      expect(seen.get(title), `duplicate title "${title}" on ${seen.get(title)} and ${file}`).toBeUndefined();
      seen.set(title, file);
    }
  });
});

describe('3. meta descriptions are present and unique site-wide', () => {
  it('every page has a distinct, substantive description', () => {
    const seen = new Map<string, string>();
    for (const file of FILES) {
      const desc =
        doc(file).querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
      expect(desc.length, `${file} description too short`).toBeGreaterThanOrEqual(50);
      expect(seen.get(desc), `duplicate description on ${seen.get(desc)} and ${file}`).toBeUndefined();
      seen.set(desc, file);
    }
  });
});

describe('4. self-referencing canonical on every page', () => {
  it.each(FILES)('%s', (file) => {
    const canonical = doc(file).querySelector('link[rel="canonical"]')?.getAttribute('href');
    expect(canonical, `${file} missing canonical`).toBe(SITE.domain + routeOf(file));
    if (file !== '404.html') {
      expect(canonical!.endsWith('/'), `${file} canonical must end with /`).toBe(true);
    }
  });
});

describe('5. no em dashes in rendered output', () => {
  it.each(FILES)('%s', (file) => {
    expect(renderedOutput(file)).not.toContain('—');
  });
});

describe('6. banned strings appear nowhere', () => {
  const BANNED = ['231 S. Bemiston', 'Schedule a Consultation', 'LocalBusiness', 'aggregateRating'];
  it.each(FILES)('%s', (file) => {
    const html = raw(file);
    for (const banned of BANNED) {
      expect(html, `${file} contains banned string "${banned}"`).not.toContain(banned);
    }
    // Entity-encoded em dashes pass markdown through to the browser as em
    // dashes; ban them in the raw HTML so the invariant cannot be evaded.
    expect(html, `${file} contains an entity-encoded em dash`).not.toMatch(
      /&mdash;|&#8212;|&#x2014;/i,
    );
  });
});

describe('7. every internal link resolves to a built page', () => {
  it.each(FILES)('%s', (file) => {
    for (const a of doc(file).querySelectorAll('a')) {
      let href = a.getAttribute('href');
      expect(href, `${file}: <a> without href ("${norm(a.text).trim()}")`).toBeTruthy();
      href = href!;
      if (/^(tel:|mailto:|#)/.test(href)) continue;
      // Links on the canonical domain are internal links in disguise.
      if (href.startsWith(SITE.domain)) href = href.slice(SITE.domain.length) || '/';
      if (/^https?:/.test(href)) continue; // external
      expect(href.startsWith('/'), `${file}: non-root-relative internal href ${href}`).toBe(true);
      const clean = href.split('#')[0].split('?')[0];
      if (!clean) continue; // fragment/query on the current page
      const hasExtension = /\.[a-z0-9]+$/i.test(clean);
      if (!hasExtension) {
        expect(clean.endsWith('/'), `${file}: internal href missing trailing slash: ${href}`).toBe(true);
      }
      const target = hasExtension ? join(DIST, clean) : join(DIST, clean, 'index.html');
      expect(existsSync(target), `${file}: broken internal link ${href}`).toBe(true);
    }
  });
});

describe('8. every image resolves to a built asset', () => {
  it.each(FILES)('%s', (file) => {
    for (const img of doc(file).querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? '';
      expect(src.length, `${file}: <img> without src`).toBeGreaterThan(0);
      if (/^(https?:|data:)/.test(src)) continue;
      const clean = src.split('#')[0].split('?')[0];
      expect(existsSync(join(DIST, clean)), `${file}: broken image ${src}`).toBe(true);
      expect(img.getAttribute('alt'), `${file}: <img> without alt attribute: ${src}`).not.toBeNull();
    }
  });
});

describe('9. all JSON-LD blocks parse cleanly', () => {
  it.each(FILES)('%s', (file) => {
    for (const script of doc(file).querySelectorAll('script[type="application/ld+json"]')) {
      const block = JSON.parse(script.text);
      expect(block['@context'], `${file}: JSON-LD without @context`).toBe('https://schema.org');
      expect(block['@type'], `${file}: JSON-LD without @type`).toBeTruthy();
    }
  });
});

describe('10. neutrality statement on every mandated page', () => {
  const MANDATED = FILES.filter(
    (file) =>
      file === 'index.html' ||
      /^services\/([^/]+\/)?index\.html$/.test(file) ||
      /^matters\/([^/]+\/)?index\.html$/.test(file) ||
      file === 'experts/jason-purinton/index.html' ||
      file === 'refer-a-case/index.html' ||
      file === 'locations/nationwide/index.html',
  );

  it('mandate set covers home, 7 services + index, 10 matters + index, expert, referral, hub', () => {
    expect(MANDATED.length).toBe(1 + 8 + 11 + 1 + 1 + 1);
  });

  it.each(MANDATED)('%s', (file) => {
    const main = doc(file).querySelector('main');
    expect(main, `${file} has no <main>`).toBeTruthy();
    expect(norm(main!.text)).toContain(SITE.neutralityStatement);
  });
});

describe('11. no file inputs anywhere on the site', () => {
  it.each(FILES)('%s', (file) => {
    const fileInputs = doc(file)
      .querySelectorAll('input')
      .filter((i) => i.getAttribute('type') === 'file');
    expect(fileInputs.length).toBe(0);
  });
});

describe('12. the conflict-check CTA is reachable from every page', () => {
  it.each(FILES)('%s', (file) => {
    const hrefs = doc(file)
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/refer-a-case/');
  });
});

describe('13. robots noindex appears only on the deliberate exclusion set', () => {
  // The form-success page (kept out of sitemap.xml) and the error document.
  // Everything else must stay indexable: a stray noindex ships silently
  // otherwise, and these two must never lose theirs.
  const NOINDEX_REQUIRED = new Set(['refer-a-case/thanks/index.html', '404.html']);

  it.each(FILES)('%s', (file) => {
    const robots = doc(file).querySelector('meta[name="robots"]');
    const content = robots?.getAttribute('content') ?? '';
    if (NOINDEX_REQUIRED.has(file)) {
      expect(content, `${file} must carry robots noindex`).toMatch(/\bnoindex\b/);
    } else {
      expect(
        /noindex|\bnone\b/.test(content),
        `${file} must not be noindexed (robots content: "${content}")`,
      ).toBe(false);
    }
  });
});

describe('14. the gated evaluations stat has one source of truth (SITE.stats)', () => {
  // LAUNCH-CHECKLIST item 2 gates the displayed evaluations figure. The number
  // also appears in prose (service pages, description150 via llms.txt), so
  // every rendered occurrence must equal SITE.stats[0].value or a correction
  // at launch would leave stale copies behind.
  const stat = SITE.stats[0];
  const expected = stat.value.replace(/\+$/, '');
  const PATTERN = /([\d,]+)\s*\+?\s*disability-related\s+vocational\s+evaluations/gi;

  it('the gated stat is the evaluations figure', () => {
    expect(stat.label).toBe('disability-related vocational evaluations');
    expect(expected).toMatch(/^[\d,]+$/);
  });

  it('every rendered occurrence of the figure matches the entity record', () => {
    let occurrences = 0;
    const texts: [string, string][] = FILES.map((file) => {
      const d = doc(file);
      d.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
      return [file, norm(d.text)];
    });
    texts.push(['llms.txt', readFileSync(join(DIST, 'llms.txt'), 'utf8')]);
    for (const [name, text] of texts) {
      for (const match of text.matchAll(PATTERN)) {
        occurrences += 1;
        expect(match[1], `${name}: "${match[0]}" disagrees with SITE.stats`).toBe(expected);
      }
    }
    // The proof band, the prose mentions, and llms.txt all carry it; if this
    // drops to zero the pattern has drifted from the copy and guards nothing.
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });
});

describe('15. astro.config site stays in lockstep with SITE.domain', () => {
  it('the config literal equals the entity record domain', () => {
    const config = readFileSync(join(process.cwd(), 'astro.config.mjs'), 'utf8');
    const site = config.match(/site:\s*'([^']+)'/)?.[1];
    expect(site, 'astro.config.mjs must declare site as a single-quoted literal').toBe(
      SITE.domain,
    );
  });
});
