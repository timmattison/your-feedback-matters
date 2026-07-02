import {
  BASKET_BOTTOM_RADIUS,
  BASKET_HEIGHT,
  BASKET_RADIUS,
} from './constants';

/**
 * Radius of the tapered basket wall at height fraction `f`, where `f = 0` is the
 * floor and `f = 1` is the mouth. The mouth keeps the full design width
 * (BASKET_RADIUS) and the wall narrows linearly to BASKET_BOTTOM_RADIUS at the
 * floor, giving the round bin its normal inward taper. Both the visible mesh and
 * the physics wall are built from this single function so they stay identical.
 */
export function basketRadiusAtHeightFraction(f: number): number {
  return BASKET_BOTTOM_RADIUS + (BASKET_RADIUS - BASKET_BOTTOM_RADIUS) * f;
}

export interface WallSlant {
  /** Length of a straight wall element spanning floor to mouth along the taper. */
  readonly length: number;
  /** Outward lean of the wall from vertical, in radians (its top sits farther out). */
  readonly tilt: number;
}

/**
 * The slant of a straight wall element (a rib or a physics segment) that bridges
 * the narrow floor and the wider mouth. Because the wall leans outward as it
 * rises, an element spanning the full height is longer than BASKET_HEIGHT and is
 * tilted from vertical by `tilt`.
 */
export function basketWallSlant(): WallSlant {
  const run = BASKET_RADIUS - BASKET_BOTTOM_RADIUS;
  return {
    length: Math.hypot(run, BASKET_HEIGHT),
    tilt: Math.atan2(run, BASKET_HEIGHT),
  };
}

export interface WallElement {
  /** World-space height (Y) of the element's centre. */
  readonly centerHeight: number;
  /** Length of the element measured along the slanted wall. */
  readonly length: number;
}

/**
 * A straight wall element spanning height fractions `f0`..`f1` of the taper.
 * Both endpoints lie on the same slanted wall line and the taper is linear, so
 * the element's length is that fraction of the full floor→mouth slant and its
 * centre sits at the mid-height of the span. The visible ribs start at the foot
 * ring (`f0 > 0`) so they don't poke through the bottom, while the physics wall
 * spans the full height (`f0 = 0`).
 */
export function basketWallElement(_f0: number, _f1: number): WallElement {
  throw new Error('not implemented');
}
