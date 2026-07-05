import { INSPECT_CRUMPLE_T } from './constants';
import { easeInOutCubic } from './crumple';

// Progress → crumple-`t` mapping for fishing a piled note out to inspect it.
//
// A note in the pile is a full wad (t = 1). To inspect it we un-crumple it up to
// ~85% flat (t = INSPECT_CRUMPLE_T ≈ 0.15) — `openingT` maps inspect progress
// p ∈ [0,1] to that un-crumpling (1 → INSPECT_CRUMPLE_T). Dismissing it re-crumples
// the note back into a full wad — `closingT` is the exact mirror
// (INSPECT_CRUMPLE_T → 1). Both feed `createCrumpleField(...).sample(u, v, t)`.
//
// The eased progress reuses the crumple's own `easeInOutCubic` (shared from
// `./crumple`), so the un-crumple traces the same curve the crumple did — the
// inspect motion is provably the reverse of wadding the sheet up.

// Multiply-form lerp: returns `b` EXACTLY at k = 1 and `a` EXACTLY at k = 0 in
// IEEE-754, so the eased endpoints (easeInOutCubic(0)=0, easeInOutCubic(1)=1)
// make the openingT/closingT endpoints exact. Do NOT switch to a + (b - a) * k —
// that form drifts the flat endpoint to 0.05000000000000004.
const lerp = (a: number, b: number, k: number): number => a * (1 - k) + b * k;

// Un-crumple: full wad (t = 1) → ~85% flat (t = INSPECT_CRUMPLE_T).
export function openingT(p: number): number {
  return lerp(1, INSPECT_CRUMPLE_T, easeInOutCubic(p));
}

// Re-crumple: ~85% flat (t = INSPECT_CRUMPLE_T) → full wad (t = 1). Mirror of opening.
export function closingT(p: number): number {
  return lerp(INSPECT_CRUMPLE_T, 1, easeInOutCubic(p));
}
