'use client';

// Public entry for the `your-feedback-matters` package. The `'use client'`
// directive marks the whole module graph as client-only so Next.js app-router
// consumers can import it from a Server Component without a manual boundary —
// the widget uses `window.matchMedia`, a WebGL probe, and requestAnimationFrame
// and can only run in the browser (see detectAnimationMode / CrumpleScene).
export {
  YourFeedbackMatters,
  type YourFeedbackMattersProps,
} from './your-feedback-matters';

export type { AnimationMode } from './core/animation-mode';
export type { FormFields } from './core/feedback-machine';
