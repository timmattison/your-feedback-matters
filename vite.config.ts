/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

// Everything a host app already provides is externalized rather than inlined:
// react + the react-three/three stack are peer dependencies (a single shared
// copy — multiple `three` copies break R3F), and html-to-image is a regular
// dependency resolved from the consumer's node_modules. So the emitted bundle
// carries only this widget's own code.
const external = [
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^three($|\/)/,
  '@react-three/fiber',
  '@react-three/cannon',
  'html-to-image',
];

export default defineConfig({
  plugins: [react()],
  // A library ships no static assets of its own — don't copy the demo's
  // public/ (favicon, icons) into the package dist.
  publicDir: false,
  build: {
    lib: {
      entry,
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    sourcemap: true,
    rollupOptions: {
      external,
      onwarn(warning, warn) {
        // Rollup preserves the entry's leading `'use client'` (src/index.ts)
        // in the emitted bundle so Next.js app-router consumers can import it
        // directly; silence the informational directive warning it emits.
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
