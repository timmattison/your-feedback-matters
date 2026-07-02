import { joltDelayMs } from './jolt';
import { SLIDE_IN_MS } from './constants';

test('slide-in jolt lands on the basket’s visual stop, not the nominal end', () => {
  // A jolt at t=0 fires while the basket is still off-screen (scatters unseen),
  // but a jolt at the full SLIDE_IN_MS fires after the easeOutExpo slide has
  // *visually* parked — the curve covers ~99% of the distance in its first ~60%,
  // then inches through a long tail — leaving a dead pause before the kick. So
  // the delay must be held for the bulk of the slide yet fire before that tail.
  const delay = joltDelayMs(true);
  expect(delay).toBeGreaterThanOrEqual(SLIDE_IN_MS / 2);
  expect(delay).toBeLessThan(SLIDE_IN_MS);
});

test('slide-out jolt fires immediately — the basket is on-screen as it leaves', () => {
  expect(joltDelayMs(false)).toBe(0);
});
