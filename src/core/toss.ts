import { mulberry32 } from './rng';
import { BALL_LINEAR_DAMPING, GRAVITY_Y, MISS_PROBABILITY } from './constants';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TossPlan {
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  willMiss: boolean;
  flightTime: number;
}

export function planToss(
  seed: number,
  from: Vec3,
  basketMouth: Vec3,
  basketRadius: number,
): TossPlan {
  const rng = mulberry32(seed);
  const willMiss = rng() < MISS_PROBABILITY;
  const flightTime = 0.8 + rng() * 0.35;
  let target = basketMouth;
  if (willMiss) {
    const a = rng() * Math.PI * 2;
    target = {
      x: basketMouth.x + Math.cos(a) * basketRadius * 1.05,
      y: basketMouth.y,
      z: basketMouth.z + Math.sin(a) * basketRadius * 1.05,
    };
  }
  // The wad is linearly damped, so its horizontal reach per unit of launch speed
  // is ∫₀ᵀ e^{-k t} dt = (1 - e^{-kT})/k, not the undamped T (with k the
  // per-second decay rate, -ln(1 - damping)). Dividing the target offset by this
  // exact factor — rather than by flightTime — makes the wad actually arrive at
  // the target under damping. The naive `Δx / flightTime` falls short by a
  // fraction of the reach, an absolute miss that grows with the throw distance,
  // so the farther the basket (the wider the screen) the more every shot lands
  // short. The vertical launch is left ballistic on purpose: its geometry is set
  // by the camera, not the screen width, so it needs no width correction and
  // keeps the toss arc that's already tuned to feel right.
  const k = -Math.log(1 - BALL_LINEAR_DAMPING);
  const reachPerVel =
    k === 0 ? flightTime : (1 - Math.exp(-k * flightTime)) / k;
  const velocity: [number, number, number] = [
    (target.x - from.x) / reachPerVel,
    (target.y - from.y - 0.5 * GRAVITY_Y * flightTime * flightTime) /
      flightTime,
    (target.z - from.z) / reachPerVel,
  ];
  const angularVelocity: [number, number, number] = [
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
  ];
  return { velocity, angularVelocity, willMiss, flightTime };
}
