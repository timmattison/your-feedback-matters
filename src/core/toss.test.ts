import { planToss, type Vec3 } from './toss';
import {
  BALL_LINEAR_DAMPING,
  BASKET_RADIUS,
  GRAVITY_Y,
  MISS_PROBABILITY,
} from './constants';

const from: Vec3 = { x: 0, y: 0, z: 0 };
const basket: Vec3 = { x: 5, y: -3, z: 0 };
const R = 0.9;

// Horizontal reach of a body launched at v0 under cannon's per-second linear
// damping, integrated over the flight. The undamped reach is just v0*T; damping
// scales it by (1 - e^-kT)/(kT) < 1, so an undamped ballistic plan lands short
// by an amount that, in absolute terms, grows with the throw distance. planToss
// must invert this (see the compensation in toss.ts) so a wad still reaches its
// target no matter how far — i.e. no matter how wide the screen.
function dampedReach(v0: number, flightTime: number): number {
  const k = -Math.log(1 - BALL_LINEAR_DAMPING);
  return k === 0 ? v0 * flightTime : (v0 * (1 - Math.exp(-k * flightTime))) / k;
}

function landingPoint(plan: ReturnType<typeof planToss>): Vec3 {
  const T = plan.flightTime;
  return {
    // Horizontal motion is damped (planToss compensates for it), so the reach is
    // the damped integral, not v0*T. Vertical stays the plain ballistic drop.
    x: from.x + dampedReach(plan.velocity[0], T),
    y: from.y + plan.velocity[1] * T + 0.5 * GRAVITY_Y * T * T,
    z: from.z + dampedReach(plan.velocity[2], T),
  };
}

test('deterministic per seed', () => {
  expect(planToss(42, from, basket, R)).toEqual(planToss(42, from, basket, R));
});

test('a make lands at the basket mouth', () => {
  for (let seed = 0; seed < 200; seed++) {
    const plan = planToss(seed, from, basket, R);
    if (plan.willMiss) continue;
    const p = landingPoint(plan);
    expect(p.x).toBeCloseTo(basket.x, 6);
    expect(p.y).toBeCloseTo(basket.y, 6);
    expect(p.z).toBeCloseTo(basket.z, 6);
  }
});

test('a miss lands on the rim circle, not the mouth center', () => {
  for (let seed = 0; seed < 400; seed++) {
    const plan = planToss(seed, from, basket, R);
    if (!plan.willMiss) continue;
    const p = landingPoint(plan);
    const rimDistance = Math.hypot(p.x - basket.x, p.z - basket.z);
    expect(rimDistance).toBeCloseTo(R * 1.05, 6);
    expect(p.y).toBeCloseTo(basket.y, 6);
  }
});

test('miss rate is roughly MISS_PROBABILITY', () => {
  let misses = 0;
  const N = 2000;
  for (let seed = 0; seed < N; seed++) {
    if (planToss(seed, from, basket, R).willMiss) misses++;
  }
  expect(misses / N).toBeGreaterThan(MISS_PROBABILITY - 0.05);
  expect(misses / N).toBeLessThan(MISS_PROBABILITY + 0.05);
});

test('a made toss reaches the basket on any screen width', () => {
  // The form is centred but the basket sits at the right edge, so on a wider
  // screen the horizontal throw distance grows without bound. A made toss must
  // still land in the basket at any width — under damping, not just on paper.
  for (const mouthX of [3, 12, 30]) {
    const mouth: Vec3 = { x: mouthX, y: -3, z: 0 };
    // willMiss depends only on the seed, so walk to the first seed that makes.
    let seed = 0;
    let plan = planToss(seed, from, mouth, R);
    while (plan.willMiss) plan = planToss(++seed, from, mouth, R);
    const landedX = from.x + dampedReach(plan.velocity[0], plan.flightTime);
    // The shortfall must stay inside the basket rather than growing with width.
    expect(Math.abs(landedX - mouthX)).toBeLessThan(BASKET_RADIUS);
  }
});

test('the ball tumbles — nonzero spin', () => {
  const plan = planToss(9, from, basket, R);
  expect(Math.hypot(...plan.angularVelocity)).toBeGreaterThan(1);
});
