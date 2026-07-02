import { mulberry32 } from './rng';

export interface CrumpleField {
  readonly seed: number;
  /** Bounding radius the ball is designed to reach at t = 1. */
  readonly ballRadius: number;
  /** Position of sheet point (u, v) ∈ [0,1]² at progress t ∈ [0,1],
      in sheet-local space (origin = sheet center, flat sheet in the XY plane). */
  sample(u: number, v: number, t: number): [number, number, number];
}

const FOLD_COUNT = 10;
// Real crumpled paper settles at well under the area-preserving sphere radius
// sqrt(A / 4π): a sheet wads down to a tight little knot. Packing this tightly
// keeps each wad small relative to the basket mouth, so several nestle and pile
// up instead of two fat balls filling the bin. (Everything downstream — the
// collider radius and the toss — derives from this, so the wad stays consistent
// in the air and on the floor.)
const BALL_PACKING = 0.32;
const RADIUS_JITTER = 0.22;

interface Fold {
  px: number;
  py: number;
  dx: number;
  dy: number;
  amp: number;
  falloff: number;
  start: number;
  sign: 1 | -1;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

// Shared crumple easing (easeInOutCubic). The forward crumple in
// `scene/crumpling-paper.tsx` drives progress through this curve, and the
// inspect un-/re-crumple (`core/inspect-crumple.ts`) reuses the very same curve
// so fishing a wad out is provably the exact reverse of wadding it up.
export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function createCrumpleField(
  seed: number,
  width: number,
  height: number,
): CrumpleField {
  const rng = mulberry32(seed);
  const scale = Math.min(width, height);
  const folds: Fold[] = Array.from({ length: FOLD_COUNT }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    return {
      px: rng(),
      py: rng(),
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      amp: (0.05 + rng() * 0.09) * scale,
      falloff: 0.08 + rng() * 0.18,
      start: (i / FOLD_COUNT) * 0.5,
      sign: rng() < 0.5 ? -1 : 1,
    };
  });
  const ballRadius = Math.sqrt((width * height) / (4 * Math.PI)) * BALL_PACKING;
  const j1 = rng() * Math.PI * 2;
  const j2 = rng() * Math.PI * 2;
  const j3 = rng() * Math.PI * 2;

  function sample(u: number, v: number, t: number): [number, number, number] {
    const x0 = (u - 0.5) * width;
    const y0 = (v - 0.5) * height;
    if (t <= 0) return [x0, y0, 0];

    // 1. sharp fold ridges appearing progressively
    let z = 0;
    for (const f of folds) {
      const w = smoothstep(f.start, f.start + 0.35, t);
      if (w === 0) continue;
      const s = (u - f.px) * -f.dy + (v - f.py) * f.dx;
      const ridge = Math.max(0, 1 - Math.abs(s) / f.falloff);
      z += f.sign * f.amp * w * ridge;
    }
    // 2. global contraction as the hand closes
    const contract = 1 - 0.35 * smoothstep(0, 0.6, t);
    const folded: [number, number, number] = [x0 * contract, y0 * contract, z];

    // 3. attraction to a lumpy ball. We *drape* the sheet over the ball rather
    // than shrink-wrapping it with a globe projection. A globe map sends v = 1
    // (the sheet's top edge) to phi = π (the sphere's south pole), so the sheet
    // sweeps through the origin and turns inside-out — a point-reflection that
    // reads as a negative scale about the center. Instead, elevation tracks v
    // and azimuth tracks u, so the map is an orientation-preserving diffeo onto
    // the ball: top stays up, bottom stays down, and the center (azim = elev = 0)
    // faces the camera (+z). Its Jacobian ∂u×∂v points radially outward
    // everywhere, so the textured front never flips to the inside.
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    const lump =
      1 +
      RADIUS_JITTER *
        (0.6 * Math.sin(3 * theta + j1) * Math.sin(2 * phi + j2) +
          0.4 * Math.sin(5 * theta + j3));
    const r = ballRadius * lump;
    const azimuth = (u - 0.5) * Math.PI * 2; // side edges meet at the back seam
    const elevation = (v - 0.5) * Math.PI; // v=0 → south, v=1 → north
    const cosEl = Math.cos(elevation);
    const target: [number, number, number] = [
      r * cosEl * Math.sin(azimuth),
      r * Math.sin(elevation),
      r * cosEl * Math.cos(azimuth),
    ];
    const k = Math.pow(smoothstep(0.3, 1, t), 1.4);
    return [
      lerp(folded[0], target[0], k),
      lerp(folded[1], target[1], k),
      lerp(folded[2], target[2], k),
    ];
  }

  return { seed, ballRadius, sample };
}
