import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The widget must be visually self-contained. Two ways a host's CSS otherwise
// breaks the form:
//   1. Text color. The form's paper card sets a light background but, if it
//      doesn't set its own `color`, the text inherits the host's — on a
//      dark-theme site that's near-white ink on near-white paper (unreadable),
//      including the feedback the user types in.
//   2. Button chrome. Bare <button>s rely on the browser's default styling; a
//      host reset (e.g. Tailwind's preflight) strips it, leaving the toss and
//      cancel buttons looking like plain text.
// Both are guarded here against the form's OWN stylesheet. We read the source
// directly rather than asserting on a rendered DOM because jsdom doesn't apply
// class-selector rules to getComputedStyle, and Vitest stubs CSS imports to
// empty strings — so the rendered form can't be inspected for these.
// Anchored at the project root (Vitest and the pre-commit hook both run from
// there) — import.meta.url isn't a file:// scheme under Vite's test transform,
// so a URL-relative read won't work.
const css = readFileSync(
  join(process.cwd(), 'src', 'feedback-form.css'),
  'utf8',
);

/**
 * Collect the declaration text of every rule whose comma-separated selector
 * list contains `selector` exactly. Purpose-built for this hand-written
 * stylesheet — it has no nesting beyond @keyframes, whose percentage frames
 * never match our class selectors — and is not a general-purpose CSS parser.
 */
function declarationsFor(selector: string): string {
  let out = '';
  for (const chunk of css.split('}')) {
    const brace = chunk.indexOf('{');
    if (brace === -1) continue;
    const selectors = chunk
      .slice(0, brace)
      .split(',')
      .map((s) => s.trim());
    if (selectors.includes(selector)) out += `${chunk.slice(brace + 1)};`;
  }
  return out;
}

// A standalone `color` declaration — not `background-color`, `border-color`,
// etc. (those have a non-boundary char immediately before "color").
const OWN_COLOR = /(?:^|[\s;{])color\s*:/;

test('the feedback form sets its own text color instead of inheriting the host’s', () => {
  expect(declarationsFor('.feedback-form')).toMatch(OWN_COLOR);
});

test('the form inputs set their own text color so typed feedback stays visible', () => {
  expect(declarationsFor('.feedback-form input')).toMatch(OWN_COLOR);
  expect(declarationsFor('.feedback-form textarea')).toMatch(OWN_COLOR);
});

test('the toss/cancel buttons have a visible surface, not bare-text browser defaults', () => {
  const button = declarationsFor('.feedback-form .actions button');
  expect(button).toMatch(/background/);
  expect(button).toMatch(/padding/);
});
