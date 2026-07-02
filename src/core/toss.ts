import { mulberry32 } from './rng';
import { GRAVITY_Y, MISS_PROBABILITY } from './constants';

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
  const velocity: [number, number, number] = [
    (target.x - from.x) / flightTime,
    (target.y - from.y - 0.5 * GRAVITY_Y * flightTime * flightTime) /
      flightTime,
    (target.z - from.z) / flightTime,
  ];
  const angularVelocity: [number, number, number] = [
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
  ];
  return { velocity, angularVelocity, willMiss, flightTime };
}
