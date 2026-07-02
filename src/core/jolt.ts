import { SLIDE_IN_MS } from './constants';

/**
 * How long (ms) to wait before jolting the pile after the basket's visibility
 * flips. Sliding IN, the basket is off-screen for the whole slide, so a jolt
 * fired at t=0 scatters the pile where nobody can see it — hold it until the
 * basket has arrived (SLIDE_IN_MS), so the papers jostle on-screen. Sliding OUT,
 * the basket is fully on-screen the instant it starts to leave, so jolt at once
 * and let the pile scatter as it departs.
 */
export function joltDelayMs(becomingVisible: boolean): number {
  return becomingVisible ? SLIDE_IN_MS : 0;
}
