import { BASKET_BOTTOM_RADIUS, BASKET_HEIGHT, BASKET_RADIUS } from './constants';

/**
 * Radius of the tapered basket wall at height fraction `f`, where `f = 0` is the
 * floor and `f = 1` is the mouth. The mouth keeps the full design width
 * (BASKET_RADIUS) and the wall narrows linearly to BASKET_BOTTOM_RADIUS at the
 * floor, giving the round bin its normal inward taper. Both the visible mesh and
 * the physics wall are built from this single function so they stay identical.
 */
export function basketRadiusAtHeightFraction(_f: number): number {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}
