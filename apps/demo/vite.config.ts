import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Resolve the widget to its SOURCE (not the built dist) so library edits
// hot-reload in the demo. An external consumer resolves `your-feedback-matters`
// through the package `exports` to `dist/` instead — this alias only exists
// inside the workspace.
const widgetSrc = fileURLToPath(new URL('../../src/index.ts', import.meta.url));

export default defineConfig({
  // Relative base so the built site works from a GitHub Pages sub-path.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'your-feedback-matters': widgetSrc,
    },
  },
});
