export type AnimationMode = 'full3d' | 'css' | 'instant';

export function pickAnimationMode(_env: {
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
}): AnimationMode {
  return 'full3d';
}
