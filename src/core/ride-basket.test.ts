import { rideBasket } from './ride-basket';

// When the window resizes, the basket (its floor centre, `base`) slides to a new
// spot. A wad resting in the pile has to ride along by the SAME delta so it stays
// put relative to the basket — otherwise it is left behind outside the relocated
// basket and the out-of-basket cull removes it. rideBasket computes the wad's new
// world position from the basket's old and new base.

test('translates a resting wad by the basket movement delta', () => {
  // basket moved by (-3, +1, 0); the wad must move by the same vector
  expect(rideBasket([1, 2, 3], [10, -5, 0], [7, -4, 0])).toEqual([-2, 3, 3]);
});

test('leaves the wad exactly where it is when the basket has not moved', () => {
  expect(rideBasket([1.5, 2.5, -3.5], [10, -5, 0], [10, -5, 0])).toEqual([
    1.5, 2.5, -3.5,
  ]);
});

test('applies the delta independently on every axis', () => {
  // base moves +2 on x, -6 on y, +4 on z
  expect(rideBasket([0, 0, 0], [1, 1, 1], [3, -5, 5])).toEqual([2, -6, 4]);
});
