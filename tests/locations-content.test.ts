// tests/locations-content.test.ts
import { describe, it, expect } from 'vitest';
import { verifyLocationContent } from '../scripts/geography/verify-content.mjs';

describe('location content verifier', () => {
  it('all location markdown passes every deterministic rule', () => {
    const res = verifyLocationContent();
    const summary = res.problems.slice(0, 25).map((p) => `${p.rule}: ${p.file} :: ${p.detail}`).join('\n');
    expect(res.ok, summary).toBe(true);
  }, 120_000);
});
