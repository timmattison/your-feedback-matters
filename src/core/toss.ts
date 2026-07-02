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
  // Stub - returns default values
  return {
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    willMiss: false,
    flightTime: 1,
  };
}
