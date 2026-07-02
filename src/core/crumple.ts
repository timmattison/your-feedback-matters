export interface CrumpleField {
  readonly seed: number;
  /** Bounding radius the ball is designed to reach at t = 1. */
  readonly ballRadius: number;
  /** Position of sheet point (u, v) ∈ [0,1]² at progress t ∈ [0,1],
      in sheet-local space (origin = sheet center, flat sheet in the XY plane). */
  sample(u: number, v: number, t: number): [number, number, number];
}

export function createCrumpleField(
  seed: number,
  _width: number,
  _height: number,
): CrumpleField {
  return { seed, ballRadius: 0, sample: () => [0, 0, 0] };
}
