import { isBallInBasket } from './basket-containment';

// A basket whose floor center sits away from the origin, so the tests prove the
// containment test is relative to the basket, not to world (0, 0, 0).
const basket = { base: [4, -3, 1] as const, radius: 1.1 };

test('a ball resting over the basket centre is in', () => {
  expect(isBallInBasket([4, -1, 1], basket)).toBe(true);
});

test('a ball within the rim radius is in', () => {
  // 0.9 out along x — inside the 1.1 rim
  expect(isBallInBasket([4.9, -2.5, 1], basket)).toBe(true);
});

test('a ball beyond the rim radius has fallen out', () => {
  // 1.5 out along x — clear of the 1.1 rim
  expect(isBallInBasket([5.5, -3, 1], basket)).toBe(false);
});

test('containment measures x and z together, not either axis alone', () => {
  // 0.8 out on each of x and z → hypot ≈ 1.13 > 1.1, so it is out even though
  // neither axis alone exceeds the radius
  expect(isBallInBasket([4.8, -3, 1.8], basket)).toBe(false);
});

test('height is ignored — a ball stacked above the rim still counts as in', () => {
  // horizontally centred but well above the rim (tall pile)
  expect(isBallInBasket([4, 50, 1], basket)).toBe(true);
});

test('a positive margin widens the mouth so rim-huggers count as in', () => {
  const justOut: [number, number, number] = [5.4, -3, 1]; // 1.4 out
  expect(isBallInBasket(justOut, basket)).toBe(false);
  expect(isBallInBasket(justOut, basket, 0.5)).toBe(true);
});
