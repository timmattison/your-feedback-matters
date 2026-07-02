import { SLIDE_IN_MS, SLIDE_IN_SETTLE_FRACTION } from './constants';

/**
 * How long (ms) to wait before jolting the pile after the basket's visibility
 * flips. Sliding IN, the basket is off-screen for the whole slide, so a jolt
 * fired at t=0 scatters the pile where nobody can see it — but a jolt at the
 * full SLIDE_IN_MS lands after the easeOutExpo slide has *visually* parked,
 * leaving a dead pause before the kick. So hold it until the basket's visual
 * stop (SLIDE_IN_SETTLE_FRACTION of the slide), landing the jolt right as the
 * basket settles. Sliding OUT, the basket is fully on-screen the instant it
 * starts to leave, so jolt at once and let the pile scatter as it departs.
 */
export function joltDelayMs(becomingVisible: boolean): number {
  return becomingVisible
    ? Math.round(SLIDE_IN_MS * SLIDE_IN_SETTLE_FRACTION)
    : 0;
}
