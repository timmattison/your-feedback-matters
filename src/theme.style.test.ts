import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The widget ships a light "paper" look by default but must be able to go dark
// so it doesn't glow as a jarring white card on a dark-theme host. Theming is
// driven by CSS custom properties: the form/badge READ their colors from
// `--yfm-*` variables (with light fallbacks baked into each `var(...)` call, so
// a standalone <FeedbackForm> with no `.page` wrapper still renders light), and
// the overlay REDEFINES those variables to a dark palette when the `theme` prop
// resolves to dark. Two triggers must exist: an explicit `theme="dark"`, and
// `theme="auto"` under `prefers-color-scheme: dark` (zero-JS, no flash).
//
// This is a stylesheet-contract test read from source, for the same reason as
// feedback-form.style.test.ts: jsdom ignores class-selector rules in
// getComputedStyle and Vitest stubs CSS imports to empty strings, so a
// rendered-DOM assertion can't see any of this. Anchored at the project root
// (Vitest and the pre-commit hook both run from there).
const read = (file: string): string =>
  readFileSync(join(process.cwd(), 'src', file), 'utf8');

const formCss = read('feedback-form.css');
const overlayCss = read('your-feedback-matters.css');

// Quote-agnostic (the repo's prettier is singleQuote, but be robust anyway).
const DARK_OVERLAY = /\[data-yfm-theme=['"]dark['"]\]/;
const AUTO_OVERLAY = /\[data-yfm-theme=['"]auto['"]\]/;

test('the feedback form paints its card from theme variables, not hardcoded colors', () => {
  expect(formCss).toMatch(/background:\s*var\(--yfm-paper/);
  expect(formCss).toMatch(/color:\s*var\(--yfm-ink/);
});

test('the form inputs and primary toss button are theme-variable driven too', () => {
  expect(formCss).toMatch(/background:\s*var\(--yfm-field-bg/);
  expect(formCss).toMatch(/var\(--yfm-accent/);
});

test('theme="dark" redefines the palette to a dark set on the overlay', () => {
  expect(overlayCss).toMatch(DARK_OVERLAY);
  // …and actually assigns the paper variable there, so it's a real repaint.
  expect(overlayCss).toMatch(/--yfm-paper:/);
});

test('theme="auto" adopts the dark palette when the OS prefers dark', () => {
  expect(overlayCss).toMatch(/prefers-color-scheme:\s*dark/);
  expect(overlayCss).toMatch(AUTO_OVERLAY);
});
