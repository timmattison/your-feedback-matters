import { openingT, closingT } from './inspect-crumple';
import { INSPECT_CRUMPLE_T } from './constants';

// A dense sample of progress values across [0,1] for monotonicity/bounds checks.
function progressSamples(n = 20): number[] {
  return Array.from({ length: n + 1 }, (_, i) => i / n);
}

test('openingT: un-crumples from a full wad (t=1) to ~95% flat (INSPECT_CRUMPLE_T)', () => {
  expect(openingT(0)).toBe(1);
  expect(openingT(1)).toBe(INSPECT_CRUMPLE_T);
});

test('openingT is strictly monotonic-decreasing across [0,1]', () => {
  const ps = progressSamples();
  for (let i = 1; i < ps.length; i++) {
    expect(openingT(ps[i])).toBeLessThan(openingT(ps[i - 1]));
  }
});

test('openingT stays within [INSPECT_CRUMPLE_T, 1] across the sample', () => {
  for (const p of progressSamples()) {
    const t = openingT(p);
    expect(t).toBeGreaterThanOrEqual(INSPECT_CRUMPLE_T);
    expect(t).toBeLessThanOrEqual(1);
  }
});

test('closingT: re-crumples from ~95% flat (INSPECT_CRUMPLE_T) back to a full wad (t=1)', () => {
  expect(closingT(0)).toBe(INSPECT_CRUMPLE_T);
  expect(closingT(1)).toBe(1);
});

test('closingT is strictly monotonic-increasing across [0,1]', () => {
  const ps = progressSamples();
  for (let i = 1; i < ps.length; i++) {
    expect(closingT(ps[i])).toBeGreaterThan(closingT(ps[i - 1]));
  }
});

test('closingT stays within [INSPECT_CRUMPLE_T, 1] across the sample', () => {
  for (const p of progressSamples()) {
    const t = closingT(p);
    expect(t).toBeGreaterThanOrEqual(INSPECT_CRUMPLE_T);
    expect(t).toBeLessThanOrEqual(1);
  }
});

test('closing mirrors opening: closingT(p) ≈ openingT(1 - p)', () => {
  for (const p of [0, 0.13, 0.25, 0.5, 0.75, 0.87, 1]) {
    expect(closingT(p)).toBeCloseTo(openingT(1 - p), 10);
  }
});
