import { planToss, type Vec3 } from './toss';
import { GRAVITY_Y, MISS_PROBABILITY } from './constants';

const from: Vec3 = { x: 0, y: 0, z: 0 };
const basket: Vec3 = { x: 5, y: -3, z: 0 };
const R = 0.9;

function landingPoint(plan: ReturnType<typeof planToss>): Vec3 {
  const T = plan.flightTime;
  return {
    x: from.x + plan.velocity[0] * T,
    y: from.y + plan.velocity[1] * T + 0.5 * GRAVITY_Y * T * T,
    z: from.z + plan.velocity[2] * T,
  };
}

test('deterministic per seed', () => {
  expect(planToss(42, from, basket, R)).toEqual(
    planToss(42, from, basket, R),
  );
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

test('the ball tumbles — nonzero spin', () => {
  const plan = planToss(9, from, basket, R);
  expect(Math.hypot(...plan.angularVelocity)).toBeGreaterThan(1);
});
