export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  void seed;
  return () => 0;
}
