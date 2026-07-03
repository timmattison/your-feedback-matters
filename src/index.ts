'use client';

// Public entry for the `your-feedback-matters` package. The `'use client'`
// directive marks the whole module graph as client-only so Next.js app-router
// consumers can import it from a Server Component without a manual boundary —
// the widget uses `window.matchMedia`, a WebGL probe, and requestAnimationFrame
// and can only run in the browser (see detectAnimationMode / CrumpleScene).
export {
  YourFeedbackMatters,
  type YourFeedbackMattersProps,
  type PoweredBy,
  type WidgetTheme,
} from './your-feedback-matters';

// Lower-level building blocks for advanced consumers who want to compose the
// scene or the form themselves rather than use the batteries-included widget.
export { CrumpleScene, type CrumpleSceneProps } from './scene/crumple-scene';
export { FeedbackForm, type FeedbackFormProps } from './feedback-form';

export type { AnimationMode } from './core/animation-mode';
export type { FormFields } from './core/feedback-machine';
export type { FieldConfig, FieldType } from './core/fields';
