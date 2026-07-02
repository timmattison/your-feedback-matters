import { renderToString } from 'react-dom/server';
import { YourFeedbackMatters } from './your-feedback-matters';
import type { CrumpleSceneProps } from './scene/crumple-scene';
import { REOPEN_BUTTON_LABEL } from './core/copy';

// A detectable stand-in for the real (WebGL) scene so we can assert whether the
// server/first render mounted it.
const SCENE_MARKER = 'crumple-scene-marker';
vi.mock('./scene/crumple-scene', () => ({
  CrumpleScene: (_props: CrumpleSceneProps) => <div>{SCENE_MARKER}</div>,
}));

// Simulate a full-WebGL browser: the environment resolves to 'full3d'. This is
// the case that used to poison hydration — the server (no scene) and the
// client's first render (scene mounted) would disagree.
vi.mock('./core/animation-mode', () => ({
  detectAnimationMode: () => 'full3d',
}));

test('server-renders without a DOM (SSR-safe) and shows the reopen button, but not the 3D scene', () => {
  // Next.js app-router server-renders even `'use client'` components: there is
  // no `window`/`document` during that pass, and the client must be able to
  // hydrate the exact same tree. So the first render must be deterministic —
  // the reopen button, and NOT the environment-specific 3D scene (which only
  // exists after mount) — regardless of what mode the browser would pick.
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    const html = renderToString(<YourFeedbackMatters />);
    expect(html).toContain(REOPEN_BUTTON_LABEL);
    expect(html).not.toContain(SCENE_MARKER);
  } finally {
    vi.unstubAllGlobals();
  }
});
