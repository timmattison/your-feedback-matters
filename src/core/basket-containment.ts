/** The bits of a basket the containment test needs: floor centre + rim radius. */
export interface BasketBounds {
  /** Floor centre in world space, `[x, y, z]`. */
  base: readonly [number, number, number];
  /** Radius of the mouth (the widest point of the taper). */
  radius: number;
}

/**
 * Whether a paper ball resting at `pos` counts as *in* the basket — a made shot
 * that should pile up — rather than one that has fallen out and should be
 * removed.
 *
 * It is a purely horizontal test: the ball's distance from the basket's centre
 * axis (x/z only) against the rim radius plus `margin`. Height is deliberately
 * ignored so a ball stacked above the rim on top of a tall pile still reads as
 * in, while anything beyond the wall — a miss that rolled away, or a paper
 * knocked clear by a slide jolt — reads as out.
 *
 * @param pos    resting ball centre, `[x, y, z]`
 * @param basket floor centre + rim radius
 * @param margin extra slack added to the rim radius (default 0)
 */
export function isBallInBasket(
  pos: readonly [number, number, number],
  basket: BasketBounds,
  margin = 0,
): boolean {
  const dx = pos[0] - basket.base[0];
  const dz = pos[2] - basket.base[2];
  return Math.hypot(dx, dz) <= basket.radius + margin;
}
