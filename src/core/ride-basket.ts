/**
 * The wad's new world position after the basket has slid from `fromBase` to
 * `toBase`.
 *
 * The pile lives in absolute world space, but the basket — its walls, floor, and
 * the containment test that decides whether a wad has fallen out — is anchored to
 * a viewport-derived base that moves whenever the window resizes. A wad resting in
 * the pile must ride the basket by the SAME delta, or it is left behind outside
 * the relocated basket and culled. This applies that delta on every axis, so the
 * wad keeps its position *relative to the basket* (still resting on the floor,
 * still inside the rim) across a resize.
 *
 * @param position the wad's current world position, `[x, y, z]`
 * @param fromBase the basket floor centre before the move
 * @param toBase   the basket floor centre after the move
 */
export function rideBasket(
  position: readonly [number, number, number],
  fromBase: readonly [number, number, number],
  toBase: readonly [number, number, number],
): [number, number, number] {
  return [
    position[0] + (toBase[0] - fromBase[0]),
    position[1] + (toBase[1] - fromBase[1]),
    position[2] + (toBase[2] - fromBase[2]),
  ];
}
