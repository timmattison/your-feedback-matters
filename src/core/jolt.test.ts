import { joltDelayMs } from './jolt';
import { SLIDE_IN_MS } from './constants';

test('slide-in jolt is held until the basket has arrived on-screen', () => {
  // A jolt at t=0 of a slide-in fires while the basket is still off-screen, so
  // the pile scatters unseen. Delaying by the slide duration lands the jolt just
  // as the basket settles into view.
  expect(joltDelayMs(true)).toBe(SLIDE_IN_MS);
});

test('slide-out jolt fires immediately — the basket is on-screen as it leaves', () => {
  expect(joltDelayMs(false)).toBe(0);
});
