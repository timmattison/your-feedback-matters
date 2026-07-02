/**
 * The wad's new world position after the basket has moved from `fromBase` to
 * `toBase`. Stub: returns the position unchanged (does not yet ride the basket).
 */
export function rideBasket(
  position: readonly [number, number, number],
  _fromBase: readonly [number, number, number],
  _toBase: readonly [number, number, number],
): [number, number, number] {
  return [position[0], position[1], position[2]];
}
