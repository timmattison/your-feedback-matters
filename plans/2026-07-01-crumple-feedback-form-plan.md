# Crumple-and-Toss Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone React app whose feedback form crumples into an imperfect paper ball (procedural mesh deformation) and gets physics-tossed at a wastebasket — occasionally rimming out — per `specs/2026-07-01-crumple-feedback-form-design.md`.

**Architecture:** All interesting logic lives in pure, seeded, unit-tested modules under `src/core/` (state machine, crumple field, toss ballistics, screen↔world math). Thin React Three Fiber components sample those pure functions into GPU buffers; `@react-three/cannon` rigid bodies handle only the toss. The DOM form is snapshotted with `html-to-image` and mapped onto the deforming plane for a seamless swap.

**Tech Stack:** Vite, React 19, TypeScript (strict), pnpm, three + @react-three/fiber + @react-three/cannon, html-to-image, vitest + @testing-library/react, husky + lint-staged.

## Global Constraints

- Package manager is **pnpm** only; run local binaries with `pnpm exec`.
- TDD is mandatory: red test → commit (`--no-verify` allowed ONLY for the red commit) → green implementation → commit. Red tests must fail on a behavioral assertion, never on a missing symbol — every task stubs the module first.
- Filenames are kebab-case. No `any` (explicit or implicit). Strict mode everywhere.
- Repeated strings become constants (button copy, error message, URLs).
- Exact copy — toss button: `Circular file, in style`; error: `Be serious, there's nothing we can do if your feedback is blank`; footer link text: `Powered by Your Feedback Matters` → `https://github.com/timmattison/your-feedback-matters`; reopen button: `Got feedback?`.
- Miss probability 0.25; crumple duration 1.1 s; plane mesh 64×64 segments; gravity −9.81 y.
- Never start dev servers — ask Tim to run `pnpm dev` for visual verification steps.
- Tests must be parallel-safe (no fixed ports/paths; jsdom only — nothing here touches shared resources).
- All work happens in the worktree at `your-feedback-matters-worktrees/crumple-spec` (path below abbreviated as `<wt>`). Use the `/Users/timmattison/code/...` form of the path for edits.

---

## Phase 1 — Scaffold + DOM form (tracer bullet: deployable page with working form, shake, cancel, footer)

### Task 1: Scaffold Vite app, test rig, pre-commit hooks, footer badge

**Files:**
- Create: entire Vite react-ts scaffold at `<wt>/` (via `pnpm create vite`)
- Create: `src/app.tsx`, `src/app.css` (replace template `App.tsx`/`App.css`)
- Create: `src/test-setup.ts`
- Create: `.husky/pre-commit`
- Modify: `vite.config.ts`, `package.json`, `src/main.tsx`, `src/index.css`
- Test: `src/app.test.tsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `App` component exported from `src/app.tsx` as `export function App(): JSX.Element`; constants file `src/core/copy.ts` exporting `REPO_URL`, `POWERED_BY_TEXT` (later tasks add more constants to it); a working `pnpm test`, `pnpm exec tsc -b`, and pre-commit hook.

- [ ] **Step 1: Scaffold the project**

```bash
cd <wt>
pnpm create vite@latest scaffold-tmp --template react-ts
rsync -a scaffold-tmp/ ./
rm -rf scaffold-tmp src/App.tsx src/App.css src/assets
pnpm install
pnpm add three @react-three/fiber @react-three/cannon html-to-image
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/three prettier lint-staged husky
```

(The template README.md gets overwritten; Task 12 writes the real one.)

- [ ] **Step 2: Configure vitest and scripts**

Replace `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

In `package.json` add scripts `"test": "vitest run"` and `"typecheck": "tsc -b"`, plus:

```json
"lint-staged": {
  "*.{ts,tsx,css,md,json}": "prettier --write"
}
```

- [ ] **Step 3: Set up husky pre-commit**

```bash
pnpm exec husky init
```

Replace `.husky/pre-commit` with:

```bash
pnpm exec lint-staged
pnpm exec tsc -b
pnpm exec vitest run
```

- [ ] **Step 4: Write the failing footer test**

Create `src/core/copy.ts`:

```ts
export const REPO_URL = 'https://github.com/timmattison/your-feedback-matters';
export const POWERED_BY_TEXT = 'Powered by Your Feedback Matters';
```

Create `src/app.tsx` as a stub WITHOUT the footer (so the test fails behaviorally):

```tsx
export function App() {
  return <main />;
}
```

Point `src/main.tsx` at it (`import { App } from './app'` and render `<App />`). Create `src/app.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './app';
import { POWERED_BY_TEXT, REPO_URL } from './core/copy';

test('footer shows the Powered by badge linking to the repo', () => {
  render(<App />);
  const link = screen.getByRole('link', { name: POWERED_BY_TEXT });
  expect(link).toHaveAttribute('href', REPO_URL);
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm exec vitest run src/app.test.tsx`
Expected: FAIL — "Unable to find an accessible element with the role link".

- [ ] **Step 6: Commit red**

```bash
git add -A && git commit --no-verify -m "test: footer badge links to repo (red)"
```

- [ ] **Step 7: Implement the footer**

`src/app.tsx`:

```tsx
import './app.css';
import { POWERED_BY_TEXT, REPO_URL } from './core/copy';

export function App() {
  return (
    <main className="page">
      <footer className="powered-by">
        <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
      </footer>
    </main>
  );
}
```

`src/app.css`:

```css
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
.powered-by {
  position: fixed;
  right: 1rem;
  bottom: 0.75rem;
  font-size: 0.8rem;
  z-index: 20;
}
.powered-by a {
  color: #888;
  text-decoration: none;
}
.powered-by a:hover {
  text-decoration: underline;
}
```

Trim `src/index.css` to a minimal reset (system font stack, `margin: 0`, `box-sizing: border-box`).

- [ ] **Step 8: Run tests + typecheck to verify green**

Run: `pnpm exec vitest run && pnpm exec tsc -b`
Expected: PASS, no type errors.

- [ ] **Step 9: Commit green**

```bash
git add -A && git commit -m "feat: scaffold app with footer badge, vitest, husky pre-commit"
```

---

### Task 2: Seeded PRNG (`rng.ts`)

**Files:**
- Create: `src/core/rng.ts`
- Test: `src/core/rng.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export type Rng = () => number` and `export function mulberry32(seed: number): Rng` — returns floats in `[0, 1)`, deterministic per seed. Used by Tasks 6 and 9.

- [ ] **Step 1: Stub + failing test**

Stub `src/core/rng.ts`:

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  void seed;
  return () => 0;
}
```

Test `src/core/rng.test.ts`:

```ts
import { mulberry32 } from './rng';

test('same seed produces the same sequence', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test('different seeds produce different sequences', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
});

test('values are in [0, 1) and vary', () => {
  const rng = mulberry32(7);
  const values = Array.from({ length: 100 }, rng);
  for (const v of values) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
  expect(new Set(values).size).toBeGreaterThan(90);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/rng.test.ts`
Expected: FAIL — "different seeds" and "values vary" assertions fail (stub returns constant 0).

- [ ] **Step 3: Commit red**

```bash
git add src/core/rng.ts src/core/rng.test.ts && git commit --no-verify -m "test: seeded PRNG determinism and range (red)"
```

- [ ] **Step 4: Implement mulberry32**

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/rng.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit green**

```bash
git add src/core/rng.ts && git commit -m "feat: mulberry32 seeded PRNG"
```

---

### Task 3: Feedback state machine (`feedback-machine.ts`)

**Files:**
- Create: `src/core/feedback-machine.ts`
- Modify: `src/core/copy.ts` (add error message + button copy constants)
- Test: `src/core/feedback-machine.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (used by Tasks 4, 7, 8, 10, 11):

```ts
export type Phase = 'closed' | 'idle' | 'error' | 'capturing' | 'crumpling' | 'tossing' | 'settling';
export interface FormFields { name: string; comment: string }
export interface FeedbackState {
  phase: Phase;
  fields: FormFields;
  errorMessage: string | null;
  tossSeed: number;
  snapshotUrl: string | null;
}
export type FeedbackEvent =
  | { type: 'OPEN' }
  | { type: 'CANCEL' }
  | { type: 'FIELD_CHANGED'; field: keyof FormFields; value: string }
  | { type: 'TOSS_REQUESTED'; seed: number }
  | { type: 'SHAKE_ENDED' }
  | { type: 'CAPTURED'; snapshotUrl: string | null }
  | { type: 'CRUMPLE_FINISHED' }
  | { type: 'BALL_RESTED' }
  | { type: 'SETTLE_FINISHED' };
export const initialState: FeedbackState;
export function isBlank(fields: FormFields): boolean;
export function feedbackReducer(state: FeedbackState, event: FeedbackEvent): FeedbackState;
```

- [ ] **Step 1: Add copy constants**

Append to `src/core/copy.ts`:

```ts
export const BLANK_FEEDBACK_MESSAGE =
  "Be serious, there's nothing we can do if your feedback is blank";
export const TOSS_BUTTON_LABEL = 'Circular file, in style';
export const CANCEL_BUTTON_LABEL = 'Cancel';
export const REOPEN_BUTTON_LABEL = 'Got feedback?';
```

- [ ] **Step 2: Stub + failing test**

Stub `src/core/feedback-machine.ts` with the types above, `initialState = { phase: 'idle', fields: { name: '', comment: '' }, errorMessage: null, tossSeed: 0, snapshotUrl: null }`, `isBlank` returning `false`, and `feedbackReducer` returning `state` unchanged for every event.

Test `src/core/feedback-machine.test.ts`:

```ts
import {
  feedbackReducer,
  initialState,
  isBlank,
  type FeedbackState,
} from './feedback-machine';
import { BLANK_FEEDBACK_MESSAGE } from './copy';

const filled: FeedbackState = {
  ...initialState,
  fields: { name: 'Tim', comment: 'Needs more cowbell' },
};

test('starts idle with empty fields', () => {
  expect(initialState.phase).toBe('idle');
  expect(initialState.fields).toEqual({ name: '', comment: '' });
});

test('isBlank is true only when both trimmed fields are empty', () => {
  expect(isBlank({ name: '  ', comment: '\n' })).toBe(true);
  expect(isBlank({ name: 'Tim', comment: '' })).toBe(false);
  expect(isBlank({ name: '', comment: 'hi' })).toBe(false);
});

test('CANCEL closes and clears fields', () => {
  const next = feedbackReducer(filled, { type: 'CANCEL' });
  expect(next.phase).toBe('closed');
  expect(next.fields).toEqual({ name: '', comment: '' });
});

test('OPEN reopens a closed form', () => {
  const closed = feedbackReducer(filled, { type: 'CANCEL' });
  expect(feedbackReducer(closed, { type: 'OPEN' }).phase).toBe('idle');
});

test('blank toss goes to error with the scolding message', () => {
  const next = feedbackReducer(initialState, { type: 'TOSS_REQUESTED', seed: 5 });
  expect(next.phase).toBe('error');
  expect(next.errorMessage).toBe(BLANK_FEEDBACK_MESSAGE);
});

test('SHAKE_ENDED returns to idle but keeps the message until an edit', () => {
  const errored = feedbackReducer(initialState, { type: 'TOSS_REQUESTED', seed: 5 });
  const calmed = feedbackReducer(errored, { type: 'SHAKE_ENDED' });
  expect(calmed.phase).toBe('idle');
  expect(calmed.errorMessage).toBe(BLANK_FEEDBACK_MESSAGE);
  const edited = feedbackReducer(calmed, {
    type: 'FIELD_CHANGED',
    field: 'comment',
    value: 'x',
  });
  expect(edited.errorMessage).toBeNull();
  expect(edited.fields.comment).toBe('x');
});

test('filled toss walks capturing → crumpling → tossing → settling → fresh idle', () => {
  let s = feedbackReducer(filled, { type: 'TOSS_REQUESTED', seed: 99 });
  expect(s.phase).toBe('capturing');
  expect(s.tossSeed).toBe(99);
  s = feedbackReducer(s, { type: 'CAPTURED', snapshotUrl: 'data:image/png;base64,x' });
  expect(s.phase).toBe('crumpling');
  expect(s.snapshotUrl).toBe('data:image/png;base64,x');
  s = feedbackReducer(s, { type: 'CRUMPLE_FINISHED' });
  expect(s.phase).toBe('tossing');
  s = feedbackReducer(s, { type: 'BALL_RESTED' });
  expect(s.phase).toBe('settling');
  s = feedbackReducer(s, { type: 'SETTLE_FINISHED' });
  expect(s.phase).toBe('idle');
  expect(s.fields).toEqual({ name: '', comment: '' });
  expect(s.snapshotUrl).toBeNull();
});

test('events in the wrong phase are ignored', () => {
  expect(feedbackReducer(initialState, { type: 'CRUMPLE_FINISHED' })).toBe(initialState);
  expect(feedbackReducer(initialState, { type: 'OPEN' })).toBe(initialState);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/feedback-machine.test.ts`
Expected: FAIL on behavioral assertions (stub never transitions).

- [ ] **Step 4: Commit red**

```bash
git add src/core/feedback-machine.ts src/core/feedback-machine.test.ts src/core/copy.ts && git commit --no-verify -m "test: feedback state machine transitions (red)"
```

- [ ] **Step 5: Implement the reducer**

```ts
import { BLANK_FEEDBACK_MESSAGE } from './copy';

// (types exactly as in the Interfaces block above)

export const initialState: FeedbackState = {
  phase: 'idle',
  fields: { name: '', comment: '' },
  errorMessage: null,
  tossSeed: 0,
  snapshotUrl: null,
};

export function isBlank(fields: FormFields): boolean {
  return fields.name.trim() === '' && fields.comment.trim() === '';
}

export function feedbackReducer(state: FeedbackState, event: FeedbackEvent): FeedbackState {
  switch (event.type) {
    case 'OPEN':
      return state.phase === 'closed' ? { ...state, phase: 'idle' } : state;
    case 'CANCEL':
      return state.phase === 'idle' || state.phase === 'error'
        ? { ...initialState, phase: 'closed' }
        : state;
    case 'FIELD_CHANGED':
      return state.phase === 'idle' || state.phase === 'error'
        ? {
            ...state,
            fields: { ...state.fields, [event.field]: event.value },
            errorMessage: null,
          }
        : state;
    case 'TOSS_REQUESTED':
      if (state.phase !== 'idle' && state.phase !== 'error') return state;
      return isBlank(state.fields)
        ? { ...state, phase: 'error', errorMessage: BLANK_FEEDBACK_MESSAGE }
        : { ...state, phase: 'capturing', tossSeed: event.seed, errorMessage: null };
    case 'SHAKE_ENDED':
      return state.phase === 'error' ? { ...state, phase: 'idle' } : state;
    case 'CAPTURED':
      return state.phase === 'capturing'
        ? { ...state, phase: 'crumpling', snapshotUrl: event.snapshotUrl }
        : state;
    case 'CRUMPLE_FINISHED':
      return state.phase === 'crumpling' ? { ...state, phase: 'tossing' } : state;
    case 'BALL_RESTED':
      return state.phase === 'tossing' ? { ...state, phase: 'settling' } : state;
    case 'SETTLE_FINISHED':
      return state.phase === 'settling' ? { ...initialState } : state;
    default:
      return state;
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/feedback-machine.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit green**

```bash
git add src/core/feedback-machine.ts && git commit -m "feat: feedback form state machine"
```

---

### Task 4: Feedback form component + app wiring

**Files:**
- Create: `src/feedback-form.tsx`, `src/feedback-form.css`
- Create: `src/scene/crumple-scene.tsx` (placeholder — real one in Task 8)
- Modify: `src/app.tsx`, `src/app.css`
- Test: `src/app.test.tsx` (extend)

**Interfaces:**
- Consumes: everything from `feedback-machine.ts` and `copy.ts`.
- Produces: `FeedbackForm` (props below) and an `App` that owns `useReducer(feedbackReducer, initialState)`. Task 7 replaces the capture stub; Task 8 replaces the scene placeholder.

```ts
interface FeedbackFormProps {
  fields: FormFields;
  errorMessage: string | null;
  shaking: boolean; // phase === 'error'
  onFieldChange(field: keyof FormFields, value: string): void;
  onCancel(): void;
  onToss(): void;
  onShakeEnd(): void;
}
// FeedbackForm = forwardRef<HTMLFormElement, FeedbackFormProps>
```

Placeholder `src/scene/crumple-scene.tsx` (keeps jsdom tests three-free until Task 8):

```tsx
export interface CrumpleSceneProps {
  phase: import('../core/feedback-machine').Phase;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
  onSettleFinished(): void;
}

export function CrumpleScene(_props: CrumpleSceneProps) {
  return null;
}
```

- [ ] **Step 1: Write the failing tests**

Append to `src/app.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import {
  BLANK_FEEDBACK_MESSAGE,
  CANCEL_BUTTON_LABEL,
  REOPEN_BUTTON_LABEL,
  TOSS_BUTTON_LABEL,
} from './core/copy';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,fake'),
}));

test('cancel closes the form immediately and clears the fields', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'Needs more cowbell');
  await user.click(screen.getByRole('button', { name: CANCEL_BUTTON_LABEL }));
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(screen.getByLabelText('Comment')).toHaveValue('');
});

test('blank toss shakes the form and shows the scolding in red', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent(BLANK_FEEDBACK_MESSAGE);
  expect(screen.getByRole('form', { name: 'Feedback form' })).toHaveClass('shake');
});

test('editing a field clears the scolding', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await user.type(screen.getByLabelText('Comment'), 'x');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a filled toss captures the form and hides it for the crumple', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Comment'), 'Needs more cowbell');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await waitFor(() =>
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument(),
  );
  // mid-flight is not the closed state — no reopen button
  expect(screen.queryByRole('button', { name: REOPEN_BUTTON_LABEL })).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/app.test.tsx`
Expected: FAIL — no form fields exist yet.

- [ ] **Step 3: Commit red**

```bash
git add src/app.test.tsx && git commit --no-verify -m "test: form behavior — cancel, blank shake, edit clears, toss captures (red)"
```

- [ ] **Step 4: Implement FeedbackForm**

`src/feedback-form.tsx`:

```tsx
import { forwardRef } from 'react';
import './feedback-form.css';
import type { FormFields } from './core/feedback-machine';
import { CANCEL_BUTTON_LABEL, TOSS_BUTTON_LABEL } from './core/copy';

export interface FeedbackFormProps {
  fields: FormFields;
  errorMessage: string | null;
  shaking: boolean;
  onFieldChange(field: keyof FormFields, value: string): void;
  onCancel(): void;
  onToss(): void;
  onShakeEnd(): void;
}

export const FeedbackForm = forwardRef<HTMLFormElement, FeedbackFormProps>(
  function FeedbackForm(
    { fields, errorMessage, shaking, onFieldChange, onCancel, onToss, onShakeEnd },
    ref,
  ) {
    return (
      <form
        ref={ref}
        aria-label="Feedback form"
        className={`feedback-form${shaking ? ' shake' : ''}`}
        onAnimationEnd={onShakeEnd}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1>Your Feedback Matters</h1>
        <label>
          Name
          <input
            type="text"
            value={fields.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
          />
        </label>
        <label>
          Comment
          <textarea
            rows={5}
            value={fields.comment}
            onChange={(e) => onFieldChange('comment', e.target.value)}
          />
        </label>
        {errorMessage !== null && (
          <p role="alert" className="blank-scolding">
            {errorMessage}
          </p>
        )}
        <div className="actions">
          <button type="button" onClick={onCancel}>
            {CANCEL_BUTTON_LABEL}
          </button>
          <button type="button" className="toss" onClick={onToss}>
            {TOSS_BUTTON_LABEL}
          </button>
        </div>
      </form>
    );
  },
);
```

`src/feedback-form.css` — paper-sheet styling plus the shake:

```css
.feedback-form {
  width: min(26rem, 90vw);
  background: #fdfdf8;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.feedback-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
}
.feedback-form input,
.feedback-form textarea {
  font: inherit;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 3px;
}
.blank-scolding {
  color: #c0392b;
  margin: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.shake {
  animation: shake 0.5s ease-in-out;
}
@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
}
```

- [ ] **Step 5: Wire App**

`src/app.tsx`:

```tsx
import { useEffect, useReducer, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import './app.css';
import { FeedbackForm } from './feedback-form';
import { CrumpleScene } from './scene/crumple-scene';
import { feedbackReducer, initialState } from './core/feedback-machine';
import { POWERED_BY_TEXT, REOPEN_BUTTON_LABEL, REPO_URL } from './core/copy';

export function App() {
  const [state, dispatch] = useReducer(feedbackReducer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formRect, setFormRect] = useState<DOMRect | null>(null);

  const formVisible =
    state.phase === 'idle' || state.phase === 'error' || state.phase === 'capturing';

  useEffect(() => {
    if (state.phase !== 'capturing') return;
    const node = formRef.current;
    if (node === null) {
      dispatch({ type: 'CAPTURED', snapshotUrl: null });
      return;
    }
    setFormRect(node.getBoundingClientRect());
    let cancelled = false;
    toPng(node)
      .then((url) => {
        if (!cancelled) dispatch({ type: 'CAPTURED', snapshotUrl: url });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'CAPTURED', snapshotUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  return (
    <main className="page">
      {formVisible && (
        <FeedbackForm
          ref={formRef}
          fields={state.fields}
          errorMessage={state.errorMessage}
          shaking={state.phase === 'error'}
          onFieldChange={(field, value) =>
            dispatch({ type: 'FIELD_CHANGED', field, value })
          }
          onCancel={() => dispatch({ type: 'CANCEL' })}
          onToss={() =>
            dispatch({
              type: 'TOSS_REQUESTED',
              seed: Math.floor(Math.random() * 2 ** 32),
            })
          }
          onShakeEnd={() => dispatch({ type: 'SHAKE_ENDED' })}
        />
      )}
      {state.phase === 'closed' && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN' })}>
          {REOPEN_BUTTON_LABEL}
        </button>
      )}
      <CrumpleScene
        phase={state.phase}
        snapshotUrl={state.snapshotUrl}
        tossSeed={state.tossSeed}
        formRect={formRect}
        onCrumpleFinished={() => dispatch({ type: 'CRUMPLE_FINISHED' })}
        onBallRested={() => dispatch({ type: 'BALL_RESTED' })}
        onSettleFinished={() => dispatch({ type: 'SETTLE_FINISHED' })}
      />
      <footer className="powered-by">
        <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
      </footer>
    </main>
  );
}
```

Also create the placeholder `src/scene/crumple-scene.tsx` shown in the Interfaces block.

- [ ] **Step 6: Run tests + typecheck to verify green**

Run: `pnpm exec vitest run && pnpm exec tsc -b`
Expected: PASS (all app + core tests).

- [ ] **Step 7: Commit green**

```bash
git add -A && git commit -m "feat: feedback form with cancel, blank-toss shake, capture wiring"
```

- [ ] **Step 8: Visual sanity check (ask Tim)**

Ask Tim to run `pnpm dev`, then confirm in the browser: form centered, shake on blank toss with red text, cancel → `Got feedback?` button, footer bottom-right. Phase 1 is a deployable tracer bullet.

---

## Phase 2 — Pure crumple math

### Task 5: Screen↔world math (`screen-to-world.ts`)

**Files:**
- Create: `src/core/screen-to-world.ts`, `src/core/constants.ts`
- Test: `src/core/screen-to-world.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (used by Task 8):

```ts
// constants.ts
export const CAMERA_FOV_DEG = 50;
export const CAMERA_DISTANCE = 10;
export const CRUMPLE_DURATION_S = 1.1;
export const MESH_SEGMENTS = 64;
export const GRAVITY_Y = -9.81;
export const BASKET_RADIUS = 0.9;
export const BASKET_HEIGHT = 1.2;
export const SETTLE_TIMEOUT_MS = 3500;
export const REST_SPEED_THRESHOLD = 0.15;
export const MISS_PROBABILITY = 0.25;

// screen-to-world.ts
export interface Viewport { width: number; height: number }
export interface CameraSpec { fovDeg: number; distance: number }
export interface WorldRect { width: number; height: number; center: [number, number, number] }
export function visibleWorldHeight(cam: CameraSpec): number;
export function domRectToWorld(
  rect: { left: number; top: number; width: number; height: number },
  viewport: Viewport,
  cam: CameraSpec,
): WorldRect;
```

- [ ] **Step 1: Stub + failing test**

Stub: `visibleWorldHeight` returns `0`; `domRectToWorld` returns `{ width: 0, height: 0, center: [0, 0, 0] }`. Create `constants.ts` with the values above (no test needed — pure data).

Test `src/core/screen-to-world.test.ts`:

```ts
import { domRectToWorld, visibleWorldHeight } from './screen-to-world';

const cam = { fovDeg: 50, distance: 10 };
const viewport = { width: 1000, height: 800 };

test('visible world height matches perspective FOV math', () => {
  // 2 * d * tan(fov/2)
  expect(visibleWorldHeight(cam)).toBeCloseTo(2 * 10 * Math.tan((50 * Math.PI) / 360), 10);
});

test('a rect centered in the viewport maps to the world origin', () => {
  const w = domRectToWorld(
    { left: 400, top: 300, width: 200, height: 200 },
    viewport,
    cam,
  );
  expect(w.center[0]).toBeCloseTo(0, 10);
  expect(w.center[1]).toBeCloseTo(0, 10);
  expect(w.center[2]).toBe(0);
});

test('a full-viewport-height rect spans the visible world height', () => {
  const w = domRectToWorld({ left: 0, top: 0, width: 100, height: 800 }, viewport, cam);
  expect(w.height).toBeCloseTo(visibleWorldHeight(cam), 10);
});

test('screen down/right maps to world down/right', () => {
  const w = domRectToWorld({ left: 900, top: 700, width: 100, height: 100 }, viewport, cam);
  expect(w.center[0]).toBeGreaterThan(0); // right of center
  expect(w.center[1]).toBeLessThan(0); // below center (world y up)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/screen-to-world.test.ts`
Expected: FAIL on the closeTo assertions.

- [ ] **Step 3: Commit red**

```bash
git add src/core/screen-to-world.ts src/core/screen-to-world.test.ts src/core/constants.ts && git commit --no-verify -m "test: DOM rect to world-space mapping (red)"
```

- [ ] **Step 4: Implement**

```ts
export function visibleWorldHeight(cam: CameraSpec): number {
  return 2 * cam.distance * Math.tan((cam.fovDeg * Math.PI) / 360);
}

export function domRectToWorld(
  rect: { left: number; top: number; width: number; height: number },
  viewport: Viewport,
  cam: CameraSpec,
): WorldRect {
  const worldPerPixel = visibleWorldHeight(cam) / viewport.height;
  const cxPx = rect.left + rect.width / 2;
  const cyPx = rect.top + rect.height / 2;
  return {
    width: rect.width * worldPerPixel,
    height: rect.height * worldPerPixel,
    center: [
      (cxPx - viewport.width / 2) * worldPerPixel,
      (viewport.height / 2 - cyPx) * worldPerPixel,
      0,
    ],
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/screen-to-world.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit green**

```bash
git add src/core/screen-to-world.ts && git commit -m "feat: screen-to-world projection math"
```

---

### Task 6: The crumple field (`crumple.ts`) — the imperfect ball

**Files:**
- Create: `src/core/crumple.ts`
- Test: `src/core/crumple.test.ts`

**Interfaces:**
- Consumes: `mulberry32` from Task 2.
- Produces (used by Task 8):

```ts
export interface CrumpleField {
  readonly seed: number;
  /** Bounding radius the ball is designed to reach at t = 1. */
  readonly ballRadius: number;
  /** Position of sheet point (u, v) ∈ [0,1]² at progress t ∈ [0,1],
      in sheet-local space (origin = sheet center, flat sheet in the XY plane). */
  sample(u: number, v: number, t: number): [number, number, number];
}
export function createCrumpleField(seed: number, width: number, height: number): CrumpleField;
```

- [ ] **Step 1: Stub + failing test**

Stub: `createCrumpleField` returns `{ seed, ballRadius: 0, sample: () => [0, 0, 0] }`.

Test `src/core/crumple.test.ts`:

```ts
import { createCrumpleField } from './crumple';

const W = 4;
const H = 5;

function grid(n = 24): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) pts.push([i / n, j / n]);
  return pts;
}

function radii(field: ReturnType<typeof createCrumpleField>, t: number): number[] {
  return grid().map(([u, v]) => {
    const [x, y, z] = field.sample(u, v, t);
    return Math.hypot(x, y, z);
  });
}

test('t = 0 is the identity — a flat sheet', () => {
  const f = createCrumpleField(1, W, H);
  expect(f.sample(0, 0, 0)).toEqual([-W / 2, -H / 2, 0]);
  expect(f.sample(1, 1, 0)).toEqual([W / 2, H / 2, 0]);
  expect(f.sample(0.5, 0.5, 0)).toEqual([0, 0, 0]);
});

test('same seed is deterministic; different seeds differ', () => {
  const a = createCrumpleField(7, W, H);
  const b = createCrumpleField(7, W, H);
  const c = createCrumpleField(8, W, H);
  expect(a.sample(0.3, 0.7, 0.5)).toEqual(b.sample(0.3, 0.7, 0.5));
  expect(a.sample(0.3, 0.7, 0.5)).not.toEqual(c.sample(0.3, 0.7, 0.5));
});

test('the sheet ends up a ball: every point within bounds, and shrunken overall', () => {
  const f = createCrumpleField(3, W, H);
  const rs = radii(f, 1);
  const flatMax = Math.hypot(W / 2, H / 2);
  expect(Math.max(...rs)).toBeLessThanOrEqual(f.ballRadius * 1.3);
  expect(Math.max(...rs)).toBeLessThan(flatMax * 0.7);
});

test('the ball is imperfect — lumpy, never a perfect sphere', () => {
  const f = createCrumpleField(3, W, H);
  const rs = radii(f, 1);
  const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / rs.length);
  expect(sd / mean).toBeGreaterThan(0.05);
});

test('mid-crumple the sheet is creased out of plane, not just scaled', () => {
  const f = createCrumpleField(5, W, H);
  const zs = grid().map(([u, v]) => Math.abs(f.sample(u, v, 0.5)[2]));
  expect(Math.max(...zs)).toBeGreaterThan(0.05);
});

test('the crumple never explodes past the flat sheet size', () => {
  const f = createCrumpleField(11, W, H);
  const flatMax = Math.hypot(W / 2, H / 2);
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    expect(Math.max(...radii(f, t))).toBeLessThanOrEqual(flatMax * 1.2);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/crumple.test.ts`
Expected: FAIL — identity, determinism-difference, lumpiness all fail on the stub.

- [ ] **Step 3: Commit red**

```bash
git add src/core/crumple.ts src/core/crumple.test.ts && git commit --no-verify -m "test: crumple field properties — identity, seeded, lumpy ball (red)"
```

- [ ] **Step 4: Implement the crumple field**

```ts
import { mulberry32 } from './rng';

// (public types exactly as in the Interfaces block above)

const FOLD_COUNT = 10;
const BALL_PACKING = 1.15;
const RADIUS_JITTER = 0.22;

interface Fold {
  px: number;
  py: number;
  dx: number;
  dy: number;
  amp: number;
  falloff: number;
  start: number;
  sign: 1 | -1;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function createCrumpleField(
  seed: number,
  width: number,
  height: number,
): CrumpleField {
  const rng = mulberry32(seed);
  const scale = Math.min(width, height);
  const folds: Fold[] = Array.from({ length: FOLD_COUNT }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    return {
      px: rng(),
      py: rng(),
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      amp: (0.05 + rng() * 0.09) * scale,
      falloff: 0.08 + rng() * 0.18,
      start: (i / FOLD_COUNT) * 0.5,
      sign: rng() < 0.5 ? -1 : 1,
    };
  });
  const ballRadius = Math.sqrt((width * height) / (4 * Math.PI)) * BALL_PACKING;
  const j1 = rng() * Math.PI * 2;
  const j2 = rng() * Math.PI * 2;
  const j3 = rng() * Math.PI * 2;

  function sample(u: number, v: number, t: number): [number, number, number] {
    const x0 = (u - 0.5) * width;
    const y0 = (v - 0.5) * height;
    if (t <= 0) return [x0, y0, 0];

    // 1. sharp fold ridges appearing progressively
    let z = 0;
    for (const f of folds) {
      const w = smoothstep(f.start, f.start + 0.35, t);
      if (w === 0) continue;
      const s = (u - f.px) * -f.dy + (v - f.py) * f.dx;
      const ridge = Math.max(0, 1 - Math.abs(s) / f.falloff);
      z += f.sign * f.amp * w * ridge;
    }
    // 2. global contraction as the hand closes
    const contract = 1 - 0.35 * smoothstep(0, 0.6, t);
    const folded: [number, number, number] = [x0 * contract, y0 * contract, z];

    // 3. attraction to a lumpy ball
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    const lump =
      1 +
      RADIUS_JITTER *
        (0.6 * Math.sin(3 * theta + j1) * Math.sin(2 * phi + j2) +
          0.4 * Math.sin(5 * theta + j3));
    const r = ballRadius * lump;
    const target: [number, number, number] = [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ];
    const k = Math.pow(smoothstep(0.3, 1, t), 1.4);
    return [
      lerp(folded[0], target[0], k),
      lerp(folded[1], target[1], k),
      lerp(folded[2], target[2], k),
    ];
  }

  return { seed, ballRadius, sample };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/crumple.test.ts`
Expected: PASS (6 tests). If a bound fails, tune `FOLD_COUNT`/`amp`/`RADIUS_JITTER` — the tests encode the design envelope, not incidental values.

- [ ] **Step 6: Commit green**

```bash
git add src/core/crumple.ts && git commit -m "feat: seeded procedural crumple field with folds, contraction, lumpy ball"
```

---

## Phase 3 — Scene: snapshot + crumple animation

### Task 7: Toss ballistics (`toss.ts`)

(Ordered before the scene so Task 8/10 consume finished math.)

**Files:**
- Create: `src/core/toss.ts`
- Test: `src/core/toss.test.ts`

**Interfaces:**
- Consumes: `mulberry32` (Task 2); `GRAVITY_Y`, `MISS_PROBABILITY` from `constants.ts` (Task 5).
- Produces (used by Task 10):

```ts
export interface Vec3 { x: number; y: number; z: number }
export interface TossPlan {
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  willMiss: boolean;
  flightTime: number;
}
export function planToss(
  seed: number,
  from: Vec3,
  basketMouth: Vec3,
  basketRadius: number,
): TossPlan;
```

- [ ] **Step 1: Stub + failing test**

Stub returns `{ velocity: [0, 0, 0], angularVelocity: [0, 0, 0], willMiss: false, flightTime: 1 }`.

Test `src/core/toss.test.ts`:

```ts
import { planToss, type Vec3 } from './toss';
import { GRAVITY_Y, MISS_PROBABILITY } from './constants';

const from: Vec3 = { x: 0, y: 0, z: 0 };
const basket: Vec3 = { x: 5, y: -3, z: 0 };
const R = 0.9;

function landingPoint(plan: ReturnType<typeof planToss>): Vec3 {
  const T = plan.flightTime;
  return {
    x: from.x + plan.velocity[0] * T,
    y: from.y + plan.velocity[1] * T + 0.5 * GRAVITY_Y * T * T,
    z: from.z + plan.velocity[2] * T,
  };
}

test('deterministic per seed', () => {
  expect(planToss(42, from, basket, R)).toEqual(planToss(42, from, basket, R));
});

test('a make lands at the basket mouth', () => {
  for (let seed = 0; seed < 200; seed++) {
    const plan = planToss(seed, from, basket, R);
    if (plan.willMiss) continue;
    const p = landingPoint(plan);
    expect(p.x).toBeCloseTo(basket.x, 6);
    expect(p.y).toBeCloseTo(basket.y, 6);
    expect(p.z).toBeCloseTo(basket.z, 6);
  }
});

test('a miss lands on the rim circle, not the mouth center', () => {
  for (let seed = 0; seed < 400; seed++) {
    const plan = planToss(seed, from, basket, R);
    if (!plan.willMiss) continue;
    const p = landingPoint(plan);
    const rimDistance = Math.hypot(p.x - basket.x, p.z - basket.z);
    expect(rimDistance).toBeCloseTo(R * 1.05, 6);
    expect(p.y).toBeCloseTo(basket.y, 6);
  }
});

test('miss rate is roughly MISS_PROBABILITY', () => {
  let misses = 0;
  const N = 2000;
  for (let seed = 0; seed < N; seed++) {
    if (planToss(seed, from, basket, R).willMiss) misses++;
  }
  expect(misses / N).toBeGreaterThan(MISS_PROBABILITY - 0.05);
  expect(misses / N).toBeLessThan(MISS_PROBABILITY + 0.05);
});

test('the ball tumbles — nonzero spin', () => {
  const plan = planToss(9, from, basket, R);
  expect(Math.hypot(...plan.angularVelocity)).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/toss.test.ts`
Expected: FAIL — landing point and spin assertions fail on the stub.

- [ ] **Step 3: Commit red**

```bash
git add src/core/toss.ts src/core/toss.test.ts && git commit --no-verify -m "test: toss ballistics — makes, rim misses, miss rate, tumble (red)"
```

- [ ] **Step 4: Implement planToss**

```ts
import { mulberry32 } from './rng';
import { GRAVITY_Y, MISS_PROBABILITY } from './constants';

// (public types exactly as in the Interfaces block above)

export function planToss(
  seed: number,
  from: Vec3,
  basketMouth: Vec3,
  basketRadius: number,
): TossPlan {
  const rng = mulberry32(seed);
  const willMiss = rng() < MISS_PROBABILITY;
  const flightTime = 0.8 + rng() * 0.35;
  let target = basketMouth;
  if (willMiss) {
    const a = rng() * Math.PI * 2;
    target = {
      x: basketMouth.x + Math.cos(a) * basketRadius * 1.05,
      y: basketMouth.y,
      z: basketMouth.z + Math.sin(a) * basketRadius * 1.05,
    };
  }
  const velocity: [number, number, number] = [
    (target.x - from.x) / flightTime,
    (target.y - from.y - 0.5 * GRAVITY_Y * flightTime * flightTime) / flightTime,
    (target.z - from.z) / flightTime,
  ];
  const angularVelocity: [number, number, number] = [
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
    (rng() - 0.5) * 14,
  ];
  return { velocity, angularVelocity, willMiss, flightTime };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/toss.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit green**

```bash
git add src/core/toss.ts && git commit -m "feat: seeded ballistic toss plan with rim-miss path"
```

---

### Task 8: R3F scene — overlay canvas, crumpling paper

**Files:**
- Replace: `src/scene/crumple-scene.tsx` (placeholder from Task 4)
- Create: `src/scene/crumpling-paper.tsx`, `src/scene/scene.css`
- Modify: `src/app.test.tsx` (mock the scene module for jsdom)
- Test: existing suites stay green; visual verification via dev server

**Interfaces:**
- Consumes: `CrumpleSceneProps` (Task 4 shape, unchanged), `createCrumpleField` (Task 6), `domRectToWorld`/`visibleWorldHeight` (Task 5), constants (Task 5).
- Produces: real `CrumpleScene`; `CrumplingPaper` props:

```ts
interface CrumplingPaperProps {
  field: CrumpleField;
  worldRect: WorldRect;
  snapshotUrl: string | null;
  onCrumpleFinished(): void; // fires exactly once at t >= 1
}
```

- Also produces for Task 10: `CrumpleScene` internally computes `basketMouth: Vec3` and `worldRect`, and at `phase === 'tossing'` renders a `TossedBall` (stub in this task: `null`) — Task 10 fills it in.

- [ ] **Step 1: Guard the jsdom tests**

Three/R3F cannot render in jsdom. At the top of `src/app.test.tsx` add:

```tsx
vi.mock('./scene/crumple-scene', () => ({
  CrumpleScene: () => null,
}));
```

Run: `pnpm exec vitest run` — must still pass before touching the scene.

- [ ] **Step 2: Implement the scene shell**

`src/scene/scene.css`:

```css
.scene-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}
```

`src/scene/crumple-scene.tsx`:

```tsx
import { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import './scene.css';
import type { Phase } from '../core/feedback-machine';
import { createCrumpleField } from '../core/crumple';
import { domRectToWorld, visibleWorldHeight } from '../core/screen-to-world';
import {
  BASKET_HEIGHT,
  BASKET_RADIUS,
  CAMERA_DISTANCE,
  CAMERA_FOV_DEG,
  GRAVITY_Y,
} from '../core/constants';
import { CrumplingPaper } from './crumpling-paper';
import { Wastebasket } from './wastebasket';

export interface CrumpleSceneProps {
  phase: Phase;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
  onSettleFinished(): void;
}

const CAMERA = { fovDeg: CAMERA_FOV_DEG, distance: CAMERA_DISTANCE };

function SceneContents(props: CrumpleSceneProps) {
  const { size } = useThree();
  const viewport = { width: size.width, height: size.height };
  const worldH = visibleWorldHeight(CAMERA);
  const worldW = worldH * (size.width / size.height);

  // basket sits bottom-right, mouth opening upward
  const basketBase: [number, number, number] = [
    worldW / 2 - BASKET_RADIUS * 2.2,
    -worldH / 2 + 0.15,
    0,
  ];
  const basketMouth = {
    x: basketBase[0],
    y: basketBase[1] + BASKET_HEIGHT,
    z: basketBase[2],
  };

  const worldRect = useMemo(
    () =>
      props.formRect === null
        ? null
        : domRectToWorld(props.formRect, viewport, CAMERA),
    [props.formRect, viewport.width, viewport.height],
  );

  const field = useMemo(
    () =>
      worldRect === null
        ? null
        : createCrumpleField(props.tossSeed, worldRect.width, worldRect.height),
    [props.tossSeed, worldRect],
  );

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />
      <Physics gravity={[0, GRAVITY_Y, 0]}>
        <Wastebasket base={basketBase} />
        {props.phase === 'crumpling' && field !== null && worldRect !== null && (
          <CrumplingPaper
            field={field}
            worldRect={worldRect}
            snapshotUrl={props.snapshotUrl}
            onCrumpleFinished={props.onCrumpleFinished}
          />
        )}
        {/* Task 10 renders <TossedBall> here for phases tossing/settling,
            aimed at basketMouth */}
        {void basketMouth}
      </Physics>
    </>
  );
}

export function CrumpleScene(props: CrumpleSceneProps) {
  return (
    <div className="scene-overlay">
      <Canvas
        gl={{ alpha: true }}
        camera={{ fov: CAMERA_FOV_DEG, position: [0, 0, CAMERA_DISTANCE] }}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
```

Also create a minimal visible-only `src/scene/wastebasket.tsx` now (collider comes in Task 10):

```tsx
import { BASKET_HEIGHT, BASKET_RADIUS } from '../core/constants';

export function Wastebasket({ base }: { base: [number, number, number] }) {
  return (
    <mesh position={[base[0], base[1] + BASKET_HEIGHT / 2, base[2]]}>
      <cylinderGeometry
        args={[BASKET_RADIUS, BASKET_RADIUS * 0.75, BASKET_HEIGHT, 24, 4, true]}
      />
      <meshStandardMaterial color="#4a4a4a" wireframe />
    </mesh>
  );
}
```

- [ ] **Step 3: Implement CrumplingPaper**

`src/scene/crumpling-paper.tsx`:

```tsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CrumpleField } from '../core/crumple';
import type { WorldRect } from '../core/screen-to-world';
import { CRUMPLE_DURATION_S, MESH_SEGMENTS } from '../core/constants';

export interface CrumplingPaperProps {
  field: CrumpleField;
  worldRect: WorldRect;
  snapshotUrl: string | null;
  onCrumpleFinished(): void;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function CrumplingPaper({
  field,
  worldRect,
  snapshotUrl,
  onCrumpleFinished,
}: CrumplingPaperProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const finished = useRef(false);

  const texture = useMemo(() => {
    if (snapshotUrl === null) return null;
    const tex = new THREE.TextureLoader().load(snapshotUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [snapshotUrl]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (mesh === null || finished.current) return;
    progress.current = Math.min(1, progress.current + delta / CRUMPLE_DURATION_S);
    const t = easeInOutCubic(progress.current);
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const [x, y, z] = field.sample(uvs.getX(i), uvs.getY(i), t);
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    if (progress.current >= 1) {
      finished.current = true;
      onCrumpleFinished();
    }
  });

  return (
    <mesh ref={meshRef} position={worldRect.center}>
      <planeGeometry
        args={[worldRect.width, worldRect.height, MESH_SEGMENTS, MESH_SEGMENTS]}
      />
      <meshStandardMaterial
        map={texture}
        color={texture === null ? '#fdfdf8' : 'white'}
        side={THREE.DoubleSide}
        roughness={0.9}
      />
    </mesh>
  );
}
```

Note: plane UVs in three run v = 0 at the bottom; `domRectToWorld` + snapshot orientation line up because the texture is applied in the same orientation as the plane. Verify visually in Step 5 and flip `tex.flipY` if the snapshot appears upside down.

- [ ] **Step 4: Verify suites + typecheck stay green**

Run: `pnpm exec vitest run && pnpm exec tsc -b`
Expected: PASS — jsdom tests use the mock; scene compiles clean.

- [ ] **Step 5: Visual verification (ask Tim)**

Ask Tim to run `pnpm dev`. Check: fill the form, hit `Circular file, in style` — the form visually becomes paper in place (snapshot texture, right size/position), crumples into a lumpy ball over ~1.1 s with visible creases, and the wire basket sits bottom-right. The ball will freeze mid-air after crumpling (toss is Task 10) — expected. Use claude-in-chrome to screenshot and confirm alignment; fix `flipY`/offsets if needed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: R3F overlay scene with snapshot-textured crumpling paper"
```

---

## Phase 4 — Physics toss, basket collider, reset loop

### Task 9: Wastebasket collider + ground

**Files:**
- Modify: `src/scene/wastebasket.tsx`
- Create: `src/scene/ground.tsx`

**Interfaces:**
- Consumes: constants (Task 5), `@react-three/cannon` statics.
- Produces: `Wastebasket({ base })` — visible wire basket **plus** static compound collider (12 wall segments + floor disc); `Ground({ y })` — static physics plane (invisible) so missed balls bounce/roll.

- [ ] **Step 1: Implement collider walls**

Replace `src/scene/wastebasket.tsx`:

```tsx
import { useBox, useCylinder } from '@react-three/cannon';
import { BASKET_HEIGHT, BASKET_RADIUS } from '../core/constants';

const WALL_SEGMENTS = 12;

function WallSegment({
  base,
  index,
}: {
  base: [number, number, number];
  index: number;
}) {
  const angle = (index / WALL_SEGMENTS) * Math.PI * 2;
  const segmentWidth = 2 * Math.PI * BASKET_RADIUS / WALL_SEGMENTS;
  useBox(() => ({
    type: 'Static',
    args: [segmentWidth * 1.1, BASKET_HEIGHT, 0.05],
    position: [
      base[0] + Math.cos(angle) * BASKET_RADIUS,
      base[1] + BASKET_HEIGHT / 2,
      base[2] + Math.sin(angle) * BASKET_RADIUS,
    ],
    rotation: [0, -angle + Math.PI / 2, 0],
  }));
  return null;
}

export function Wastebasket({ base }: { base: [number, number, number] }) {
  useCylinder(() => ({
    type: 'Static',
    args: [BASKET_RADIUS, BASKET_RADIUS, 0.05, 16],
    position: [base[0], base[1] + 0.05, base[2]],
  }));
  return (
    <>
      {Array.from({ length: WALL_SEGMENTS }, (_, i) => (
        <WallSegment key={i} base={base} index={i} />
      ))}
      <mesh position={[base[0], base[1] + BASKET_HEIGHT / 2, base[2]]}>
        <cylinderGeometry
          args={[BASKET_RADIUS, BASKET_RADIUS * 0.75, BASKET_HEIGHT, 24, 4, true]}
        />
        <meshStandardMaterial color="#4a4a4a" wireframe />
      </mesh>
    </>
  );
}
```

Create `src/scene/ground.tsx`:

```tsx
import { usePlane } from '@react-three/cannon';

export function Ground({ y }: { y: number }) {
  usePlane(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, y, 0],
  }));
  return null;
}
```

Render `<Ground y={-worldH / 2 + 0.1} />` inside `SceneContents`' `<Physics>`.

- [ ] **Step 2: Verify + commit**

Run: `pnpm exec vitest run && pnpm exec tsc -b` → PASS.

```bash
git add -A && git commit -m "feat: wastebasket compound collider and ground plane"
```

---

### Task 10: TossedBall — physics flight, rest detection, reset loop

**Files:**
- Create: `src/scene/tossed-ball.tsx`
- Modify: `src/scene/crumple-scene.tsx` (render ball during tossing/settling; keep crumpled geometry alive)
- Modify: `src/scene/crumpling-paper.tsx` (expose final geometry via `onCrumpleFinished(geometry)`)
- Test: extend `src/app.test.tsx` for the full reset loop (scene mocked, machine-driven)

**Interfaces:**
- Consumes: `planToss` (Task 7), `CrumpleField.ballRadius` (Task 6), constants.
- Produces / modifies:

```ts
// crumpling-paper.tsx — signature change:
onCrumpleFinished(geometry: THREE.BufferGeometry): void;

// tossed-ball.tsx:
interface TossedBallProps {
  geometry: THREE.BufferGeometry; // the crumpled mesh, cloned
  snapshotUrl: string | null;
  startPosition: [number, number, number];
  ballRadius: number;
  seed: number;
  basketMouth: { x: number; y: number; z: number };
  fading: boolean; // true during 'settling'
  onRested(): void; // once, when calm or timed out
}
```

- [ ] **Step 1: Write the failing reset-loop test**

Append to `src/app.test.tsx` (scene still mocked — this drives the machine through App's props; capture the mocked scene's props to fire its callbacks):

```tsx
import type { CrumpleSceneProps } from './scene/crumple-scene';

const sceneProps: { current: CrumpleSceneProps | null } = { current: null };
vi.mock('./scene/crumple-scene', () => ({
  CrumpleScene: (props: CrumpleSceneProps) => {
    sceneProps.current = props;
    return null;
  },
}));

test('after the toss settles, a fresh empty form is ready for another round', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Comment'), 'straight to the bin');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await waitFor(() => expect(sceneProps.current?.phase).toBe('crumpling'));
  act(() => sceneProps.current?.onCrumpleFinished());
  expect(sceneProps.current?.phase).toBe('tossing');
  act(() => sceneProps.current?.onBallRested());
  expect(sceneProps.current?.phase).toBe('settling');
  act(() => sceneProps.current?.onSettleFinished());
  expect(screen.getByLabelText('Comment')).toHaveValue('');
  expect(screen.getByLabelText('Name')).toHaveValue('');
});
```

(Replace the single `vi.mock` from Task 8 with this props-capturing version; import `act` from `@testing-library/react`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/app.test.tsx`
Expected: The new test fails at `sceneProps.current?.phase` transitions if App doesn't wire callbacks/phases correctly; if App wiring from Task 4 already satisfies it, tighten by asserting `phase` values — the test must exercise the full loop. (If it passes immediately because Task 4 wired everything, note that in the commit and skip to Step 4 — the behavioral coverage is the point.)

- [ ] **Step 3: Commit (red or coverage)**

```bash
git add src/app.test.tsx && git commit --no-verify -m "test: full toss → settle → fresh form reset loop"
```

- [ ] **Step 4: Change CrumplingPaper to hand off its geometry**

In `crumpling-paper.tsx`, change the prop to `onCrumpleFinished(geometry: THREE.BufferGeometry): void` and call `onCrumpleFinished(mesh.geometry.clone())` at completion (before the parent unmounts this component).

- [ ] **Step 5: Implement TossedBall**

`src/scene/tossed-ball.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import { planToss } from '../core/toss';
import {
  BASKET_RADIUS,
  REST_SPEED_THRESHOLD,
  SETTLE_TIMEOUT_MS,
} from '../core/constants';

// (props exactly as in the Interfaces block above)

export function TossedBall({
  geometry,
  snapshotUrl,
  startPosition,
  ballRadius,
  seed,
  basketMouth,
  fading,
  onRested,
}: TossedBallProps) {
  const plan = useMemo(
    () =>
      planToss(
        seed,
        { x: startPosition[0], y: startPosition[1], z: startPosition[2] },
        basketMouth,
        BASKET_RADIUS,
      ),
    [seed, startPosition, basketMouth],
  );

  const [ref, api] = useSphere(() => ({
    mass: 0.05,
    args: [ballRadius],
    position: startPosition,
    velocity: plan.velocity,
    angularVelocity: plan.angularVelocity,
    linearDamping: 0.1,
    angularDamping: 0.1,
  }));

  const restedRef = useRef(false);
  useEffect(() => {
    let calmFrames = 0;
    const startedAt = performance.now();
    const unsubscribe = api.velocity.subscribe(([vx, vy, vz]) => {
      if (restedRef.current) return;
      const speed = Math.hypot(vx, vy, vz);
      calmFrames = speed < REST_SPEED_THRESHOLD ? calmFrames + 1 : 0;
      const timedOut = performance.now() - startedAt > SETTLE_TIMEOUT_MS;
      if (calmFrames > 30 || timedOut) {
        restedRef.current = true;
        onRested();
      }
    });
    return unsubscribe;
  }, [api.velocity, onRested]);

  const material = useMemo(() => {
    const texture =
      snapshotUrl === null ? null : new THREE.TextureLoader().load(snapshotUrl);
    if (texture !== null) texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: texture === null ? '#fdfdf8' : 'white',
      side: THREE.DoubleSide,
      roughness: 0.9,
      transparent: true,
    });
  }, [snapshotUrl]);

  useEffect(() => {
    if (fading) material.opacity = 0.999; // kick transparency; fade below
  }, [fading, material]);

  // gentle fade while settling
  useEffect(() => {
    if (!fading) return;
    let raf = 0;
    const step = () => {
      material.opacity = Math.max(0, material.opacity - 0.03);
      if (material.opacity > 0) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fading, material]);

  return <mesh ref={ref} geometry={geometry} material={material} />;
}
```

- [ ] **Step 6: Wire the scene**

In `crumple-scene.tsx`, hold the handed-off geometry in state and render the ball:

```tsx
const [crumpledGeometry, setCrumpledGeometry] =
  useState<THREE.BufferGeometry | null>(null);

// in the crumpling branch:
<CrumplingPaper
  field={field}
  worldRect={worldRect}
  snapshotUrl={props.snapshotUrl}
  onCrumpleFinished={(geometry) => {
    setCrumpledGeometry(geometry);
    props.onCrumpleFinished();
  }}
/>

// new branch:
{(props.phase === 'tossing' || props.phase === 'settling') &&
  crumpledGeometry !== null &&
  field !== null &&
  worldRect !== null && (
    <TossedBall
      geometry={crumpledGeometry}
      snapshotUrl={props.snapshotUrl}
      startPosition={worldRect.center}
      ballRadius={field.ballRadius}
      seed={props.tossSeed}
      basketMouth={basketMouth}
      fading={props.phase === 'settling'}
      onRested={props.onBallRested}
    />
  )}
```

In `App`, drive `SETTLE_FINISHED` on a timer when entering `settling`:

```tsx
useEffect(() => {
  if (state.phase !== 'settling') return;
  const id = setTimeout(() => dispatch({ type: 'SETTLE_FINISHED' }), 1200);
  return () => clearTimeout(id);
}, [state.phase]);
```

- [ ] **Step 7: Verify green + visual check**

Run: `pnpm exec vitest run && pnpm exec tsc -b` → PASS.

Ask Tim to run `pnpm dev` and throw several forms: the ball should arc bottom-right, usually swish into the basket, occasionally clang off the rim and roll away; the form returns fresh each time. Use claude-in-chrome to record a GIF (`crumple_toss.gif`) of one make and one miss.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: physics toss with rim misses, rest detection, and reset loop"
```

---

## Phase 5 — Fallbacks, polish, ship

### Task 11: Reduced-motion + no-WebGL fallbacks

**Files:**
- Create: `src/core/animation-mode.ts`
- Modify: `src/app.tsx`, `src/app.css`
- Test: `src/core/animation-mode.test.ts`, extend `src/app.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces:

```ts
export type AnimationMode = 'full3d' | 'css' | 'instant';
export function pickAnimationMode(env: {
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
}): AnimationMode;
export function detectAnimationMode(): AnimationMode; // reads matchMedia + canvas probe
```

- [ ] **Step 1: Stub + failing test**

Stub `pickAnimationMode` returns `'full3d'` always.

Test `src/core/animation-mode.test.ts`:

```ts
import { pickAnimationMode } from './animation-mode';

test('reduced motion wins over everything', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: true, webglAvailable: true }),
  ).toBe('instant');
});

test('no WebGL falls back to the CSS toss', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: false, webglAvailable: false }),
  ).toBe('css');
});

test('full experience when everything is available', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: false, webglAvailable: true }),
  ).toBe('full3d');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/animation-mode.test.ts`
Expected: FAIL (2 of 3).

- [ ] **Step 3: Commit red**

```bash
git add src/core/animation-mode.ts src/core/animation-mode.test.ts && git commit --no-verify -m "test: animation mode selection (red)"
```

- [ ] **Step 4: Implement**

```ts
export type AnimationMode = 'full3d' | 'css' | 'instant';

export function pickAnimationMode(env: {
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
}): AnimationMode {
  if (env.prefersReducedMotion) return 'instant';
  if (!env.webglAvailable) return 'css';
  return 'full3d';
}

export function detectAnimationMode(): AnimationMode {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  let webglAvailable = false;
  try {
    webglAvailable = document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    webglAvailable = false;
  }
  return pickAnimationMode({ prefersReducedMotion, webglAvailable });
}
```

App integration: compute `const mode = useMemo(detectAnimationMode, [])`.
- `full3d`: current behavior.
- `css`: skip the scene entirely; when phase enters `crumpling`, add class `css-toss` to the form's wrapper (a `div` around `FeedbackForm` that stays mounted through the animation showing a static copy is over-engineering — instead keep the form visible with the class and dispatch `CRUMPLE_FINISHED` → `BALL_RESTED` → on `animationend` `SETTLE_FINISHED`). CSS:

```css
.css-toss {
  animation: css-toss 1.2s ease-in forwards;
}
@keyframes css-toss {
  30% { transform: scale(0.5) rotate(20deg); }
  100% { transform: scale(0.05) rotate(540deg) translate(60vw, 40vh); opacity: 0; }
}
```

- `instant`: on `crumpling`, immediately dispatch through to `SETTLE_FINISHED` (brief opacity fade via a 200ms timeout).

Add an app test with `mode` forced (export an optional `mode` prop on `App` defaulting to `detectAnimationMode()`): `render(<App mode="instant" />)`, filled toss → form resets without scene callbacks.

- [ ] **Step 5: Verify green + commit**

Run: `pnpm exec vitest run && pnpm exec tsc -b` → PASS.

```bash
git add -A && git commit -m "feat: reduced-motion and no-WebGL fallback modes"
```

---

### Task 12: README, WISHLIST, GitHub Pages deploy, final verification

**Files:**
- Create: `README.md` (replace template), `WISHLIST.md`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Write README**

Cover: what it is (the joke included), a GIF (`docs/crumple_toss.gif` from Task 10's recording), stack, `pnpm install` / `pnpm dev` / `pnpm test`, architecture map (core/ pure modules vs scene/), link to spec and plan.

- [ ] **Step 2: WISHLIST**

`WISHLIST.md` seeded with: paper sound effects (crinkle + swish/clang), basket "score counter", extract `<YourFeedbackMatters />` as an npm package.

- [ ] **Step 3: GitHub Pages workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsc -b
      - run: pnpm test
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Full verification**

Run: `pnpm exec vitest run && pnpm exec tsc -b && pnpm build`
Expected: all green, `dist/` builds.

Ask Tim to run `pnpm dev` for a final end-to-end pass: blank scold → cancel/reopen → filled toss make → filled toss miss (retry until one misses) → reset loop → footer link.

- [ ] **Step 5: Commit + hand off**

```bash
git add -A && git commit -m "docs: README, wishlist, GitHub Pages deploy workflow"
```

Then merge the worktree branch per the finishing-a-development-branch skill (squash-merge PR to `main` on `timmattison/your-feedback-matters`).
