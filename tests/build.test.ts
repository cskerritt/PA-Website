import { describe, it, expect } from 'vitest';
import { parseDist } from './helpers';

describe('build output', () => {
  it('homepage builds with canonical, single H1, meta description', () => {
    const doc = parseDist('');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://purintonanalytics.com/');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length)
      .toBeGreaterThan(50);
  });
});
