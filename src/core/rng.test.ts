import { mulberry32 } from './rng';

test('same seed produces the same sequence', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test('different seeds produce different sequences', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
});

test('values are in [0, 1) and vary', () => {
  const rng = mulberry32(7);
  const values = Array.from({ length: 100 }, rng);
  for (const v of values) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
  expect(new Set(values).size).toBeGreaterThan(90);
});
