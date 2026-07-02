export type AnimationMode = 'full3d' | 'css' | 'instant';

export function pickAnimationMode(env: {
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
}): AnimationMode {
  if (env.prefersReducedMotion) return 'instant';
  if (!env.webglAvailable) return 'css';
  return 'full3d';
}

/**
 * Reads the live environment (prefers-reduced-motion media query + a WebGL2
 * capability probe) and resolves it to an {@link AnimationMode} via
 * {@link pickAnimationMode}.
 *
 * `window.matchMedia` is guarded because some test environments (jsdom
 * without a full browser shim) don't implement it — treat that as "no
 * preference" rather than throwing.
 *
 * Called outside a browser (e.g. during Next.js server-side rendering, where
 * `window`/`document` don't exist) it returns `'instant'` — a safe,
 * WebGL-free default that renders anywhere and never throws.
 */
export function detectAnimationMode(): AnimationMode {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return 'instant';
  const prefersReducedMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  let webglAvailable = false;
  try {
    webglAvailable =
      document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    webglAvailable = false;
  }
  return pickAnimationMode({ prefersReducedMotion, webglAvailable });
}
