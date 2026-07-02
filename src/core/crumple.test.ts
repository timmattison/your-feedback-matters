import { createCrumpleField } from './crumple';

const W = 4;
const H = 5;

function grid(n = 24): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) pts.push([i / n, j / n]);
  return pts;
}

function radii(
  field: ReturnType<typeof createCrumpleField>,
  t: number,
): number[] {
  return grid().map(([u, v]) => {
    const [x, y, z] = field.sample(u, v, t);
    return Math.hypot(x, y, z);
  });
}

test('t = 0 is the identity — a flat sheet', () => {
  const f = createCrumpleField(1, W, H);
  expect(f.sample(0, 0, 0)).toEqual([-W / 2, -H / 2, 0]);
  expect(f.sample(1, 1, 0)).toEqual([W / 2, H / 2, 0]);
  expect(f.sample(0.5, 0.5, 0)).toEqual([0, 0, 0]);
});

test('same seed is deterministic; different seeds differ', () => {
  const a = createCrumpleField(7, W, H);
  const b = createCrumpleField(7, W, H);
  const c = createCrumpleField(8, W, H);
  expect(a.sample(0.3, 0.7, 0.5)).toEqual(b.sample(0.3, 0.7, 0.5));
  expect(a.sample(0.3, 0.7, 0.5)).not.toEqual(c.sample(0.3, 0.7, 0.5));
});

test('the sheet ends up a ball: every point within bounds, and shrunken overall', () => {
  const f = createCrumpleField(3, W, H);
  const rs = radii(f, 1);
  const flatMax = Math.hypot(W / 2, H / 2);
  expect(Math.max(...rs)).toBeLessThanOrEqual(f.ballRadius * 1.3);
  expect(Math.max(...rs)).toBeLessThan(flatMax * 0.7);
});

test('the ball is imperfect — lumpy, never a perfect sphere', () => {
  const f = createCrumpleField(3, W, H);
  const rs = radii(f, 1);
  const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / rs.length);
  expect(sd / mean).toBeGreaterThan(0.05);
});

test('mid-crumple the sheet is creased out of plane, not just scaled', () => {
  // t = 0.3 sits exactly at the sphere-attraction onset (smoothstep(0.3, 1, 0.3) = 0),
  // so every bit of z here must come from the fold ridges — deleting the fold loop
  // makes this fail, unlike later t where the sphere target leaks z on its own.
  // The threshold is relative to sheet size because fold amplitude scales with
  // min(width, height); measured worst case over seeds 0..99 is ~0.057 * min(W, H).
  const f = createCrumpleField(5, W, H);
  const zs = grid().map(([u, v]) => Math.abs(f.sample(u, v, 0.3)[2]));
  expect(Math.max(...zs)).toBeGreaterThan(0.01 * Math.min(W, H));
});

test('the crumple never explodes past the flat sheet size', () => {
  const f = createCrumpleField(11, W, H);
  const flatMax = Math.hypot(W / 2, H / 2);
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    expect(Math.max(...radii(f, t))).toBeLessThanOrEqual(flatMax * 1.2);
  }
});
