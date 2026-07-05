# Your Feedback Matters

NOTE: This project was created with AI because I had a funny idea and just wanted to get it done. If you don't like that you can use this component to report your feelings.

An optimized website feedback system that is possibly GDPR capable.

People "submit" their feedback. That feedback is "stored" where it can only be reviewed in the same browser that submitted it. No servers, no databases, no complaints. (Or wire up `onSubmit` and send it wherever you like — the widget stays storage-agnostic.)

But please, don't waste our time by trying to file a blank form. It's not fair to you. It's not fair to us. Let's work together to make sure everyone's feedback matters equally.

## Install

`your-feedback-matters` is a standalone, drop-in React component. Install it straight from GitHub — no npm-registry publish required:

```bash
# latest on the default branch
pnpm add github:timmattison/your-feedback-matters
# …or pin to a tag/commit
pnpm add github:timmattison/your-feedback-matters#v1.0.0
```

Installing from a git URL runs the package's `prepare` script, which builds the library (`dist/`) on install, so the import is ready to use immediately.

### Peer dependencies

The React + Three.js stack is declared as **peer dependencies** so the host app's single copy is reused (more than one `three` in a bundle breaks React Three Fiber). Make sure the host has them:

```bash
pnpm add react react-dom three @react-three/fiber @react-three/cannon
```

`html-to-image` is a regular dependency (a leaf utility with no singleton concern) and is installed for you.

> Note: `@react-three/cannon` (which pulls in `cannon-es`) is the least-maintained dependency in the stack and a candidate to revisit; it is what powers the physics toss.

## Usage

```tsx
import { YourFeedbackMatters } from 'your-feedback-matters';
import 'your-feedback-matters/style.css'; // one stylesheet, scoped to the widget

export function ContactPage() {
  return (
    <YourFeedbackMatters
      title="Tell us what you think"
      onSubmit={(feedback) => {
        // feedback is the collected field values, e.g. { name, comment }.
        // POST it, store it, log it — whatever you like.
        fetch('/api/feedback', {
          method: 'POST',
          body: JSON.stringify(feedback),
        });
      }}
    />
  );
}
```

You get the whole experience — crumple → toss → basket, the CSS/instant fallbacks, and fish-a-note-back-out — without pulling in this repo's page layout, branding, or global CSS resets.

### Custom fields

By default the form collects **Name** (text) and **Comment** (textarea). Pass `fields` to collect whatever you want; `onSubmit` receives a `Record<string, string>` keyed by each field's `name`:

```tsx
<YourFeedbackMatters
  fields={[
    { name: 'email', label: 'Email' },
    { name: 'message', label: 'Message', type: 'textarea', rows: 6 },
    { name: 'referrer', label: 'How did you hear about us?', required: false },
  ]}
  onSubmit={(values) => {
    // values = { email, message, referrer }
  }}
/>
```

### Drop the "Powered by" badge

By default a small "Powered by Your Feedback Matters" badge links back to this project. Turn it off, or point it at yourself:

```tsx
<YourFeedbackMatters poweredBy={false} />
<YourFeedbackMatters poweredBy={{ text: 'Feedback by Acme', href: 'https://acme.example' }} />
```

## Props

All props are optional.

| Prop           | Type                                        | Default                     | Description                                                                                                                                                                                                       |
| -------------- | ------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onSubmit`     | `(feedback: Record<string,string>) => void` | —                           | Called once with the field values the moment a non-blank toss is accepted. Blank tosses (which shake + scold) never fire it.                                                                                      |
| `fields`       | `FieldConfig[]`                             | Name + Comment              | The fields to collect. `FieldConfig = { name; label; type?: 'text' \| 'textarea'; rows?; required? }`. Read once at mount.                                                                                        |
| `title`        | `string`                                    | `'Your Feedback Matters'`   | Heading above the fields.                                                                                                                                                                                         |
| `tossLabel`    | `string`                                    | `'Circular file, in style'` | Label on the toss/submit button.                                                                                                                                                                                  |
| `cancelLabel`  | `string`                                    | `'Cancel'`                  | Label on the cancel button.                                                                                                                                                                                       |
| `reopenLabel`  | `string`                                    | `'Got feedback?'`           | Label on the closed-landing reopen button.                                                                                                                                                                        |
| `blankMessage` | `string`                                    | the built-in scold          | Shown when a blank form is tossed.                                                                                                                                                                                |
| `poweredBy`    | `boolean \| { text; href }`                 | `true`                      | `false` hides the footer badge; an object customizes its text/link.                                                                                                                                               |
| `theme`        | `'light' \| 'dark' \| 'auto'`               | `'auto'`                    | Color theme for the paper form + badge. `'auto'` follows `prefers-color-scheme`; `'dark'`/`'light'` force it — use `'dark'` on a site that's always dark regardless of the visitor's OS. See [Theming](#theming). |
| `mode`         | `'full3d' \| 'css' \| 'instant'`            | auto-detected               | Escape hatch to force the render mode. Omit it in production — the mode is derived from the environment (see [Fallbacks](#fallbacks)).                                                                            |

### Advanced exports

For consumers who want to compose the pieces themselves, the lower-level `CrumpleScene` (`CrumpleSceneProps`) and `FeedbackForm` (`FeedbackFormProps`) are exported from the package root too, alongside the `FieldConfig`, `FieldType`, `FormFields`, `AnimationMode`, `PoweredBy`, and `WidgetTheme` types.

## Layout contract

The widget renders as a **fixed, full-viewport overlay** that floats above the host page — the form/button are centered, the wire wastebasket sits bottom-right, and the badge sits bottom-right too. It deliberately does **not** take space in the host's normal document flow, so dropping it in doesn't push content around.

- The overlay container is **click-through** (`pointer-events: none`); only the form, the reopen button, the badge, and the in-basket hit-targets capture clicks, so the rest of the host page stays fully usable.
- It clips its own overflow, so the basket's off-screen slide never adds a horizontal scrollbar to the host — no global `body { overflow-x: hidden }` required.
- It ships **no global reset**: `box-sizing` and the default font are scoped to the widget's own subtree.
- It uses a high `z-index` to sit above host content. Need to restyle it (corner-anchor the button, lower the z-index, etc.)? Override `.page` in your own CSS after importing the stylesheet.

## Styles

Import the single stylesheet once, anywhere in your app:

```ts
import 'your-feedback-matters/style.css';
```

There are no path-based assets to resolve — the crumpled-paper texture is generated at runtime from a DOM snapshot (`html-to-image`), so there are no images/fonts/GLTFs to bundle.

### Theming

The widget ships a light "paper" look and a matching dark palette. Pick one with the `theme` prop:

```tsx
<YourFeedbackMatters theme="dark" />   {/* force dark */}
<YourFeedbackMatters theme="light" />  {/* force light */}
<YourFeedbackMatters theme="auto" />   {/* default: follow the OS */}
```

`'auto'` follows the visitor's `prefers-color-scheme` **in pure CSS** — the dark palette applies before hydration with no flash. Reach for `'dark'` (or `'light'`) when your site forces a theme regardless of the visitor's OS setting (e.g. an always-dark blog).

Both themes are built from a small set of CSS custom properties, so you can also craft your own palette without forking. Set any of these on the overlay (its class is `.page`), and only the ones you override change:

```css
.page {
  --yfm-paper: #101418; /* form background */
  --yfm-ink: #e8eaed; /* text + input/label ink */
  --yfm-accent: #58a6ff; /* filled "toss" button */
  --yfm-accent-ink: #0d1117; /* text on the toss button */
  --yfm-field-bg: #0d1117; /* input/textarea background */
  /* …also: --yfm-border, --yfm-shadow, --yfm-field-border, --yfm-danger,
     --yfm-btn-bg, --yfm-btn-border, --yfm-btn-bg-hover,
     --yfm-btn-border-hover, --yfm-accent-hover, and the --yfm-badge-* set. */
}
```

Each variable has its light value baked in as a `var()` fallback, so partial overrides are safe. Setting `theme="dark"` just assigns the built-in dark values to these same variables.

## SSR / Next.js

The package ships with a `'use client'` directive and is safe to import from a Server Component (e.g. the Next.js app router). It never touches `window` during render: the animation mode is resolved to a deterministic default on the server and upgraded to the real (WebGL/reduced-motion-aware) mode after the component mounts, so hydration matches. The widget is client-only at runtime — it uses `window.matchMedia`, a WebGL probe, and `requestAnimationFrame`.

---

## How it works

1. **Fill the form.** Configurable fields (Name + Comment by default), client-side only, held in a small
   state machine (`closed → idle → error → capturing → crumpling → tossing →
settling → closed`, see `src/core/feedback-machine.ts`). The widget lands in
   `closed` — the "Got feedback?" button — and returns there after a toss or
   a cancel; the 3D basket overlay slides in on open and out on close.
2. **Snapshot.** On toss, [`html-to-image`](https://github.com/bubkoo/html-to-image)
   rasterizes the live DOM form into a PNG data URL.
3. **Crumple.** That snapshot is mapped onto a 64×64-segment plane in a
   React Three Fiber scene and deformed into a seeded, lumpy, imperfect
   paper ball via pure procedural math — fold-plane ridges that appear
   progressively, global contraction as the "hand closes," and a
   jittered-sphere attraction term that pulls the sheet into a ball that's
   never quite spherical (`src/core/crumple.ts`). No physics engine is
   involved in the crumple itself — it's a deterministic function of
   `(u, v, t)` given a seed.
4. **Toss.** [`@react-three/cannon`](https://github.com/pmndrs/use-cannon)
   takes over and gives the crumpled ball a real physics body. Its initial
   velocity and spin are solved analytically for a ballistic arc from the
   form's screen position to a wire wastebasket sitting bottom-right of the
   viewport (`src/core/toss.ts`), with a ~25% chance the aim point is
   nudged past the rim so the ball clangs off the basket and rolls away
   instead of swishing in (`MISS_PROBABILITY` in `src/core/constants.ts`).
   Rest is detected by watching the physics body's velocity settle (or a
   timeout, whichever comes first).
5. **Pile or cull.** At rest each ball checks whether it's inside the mouth
   (`isBallInBasket`, `src/core/basket-containment.ts`). Made shots persist —
   the pile lives in the scene across the closed↔open cycle, so paper
   accumulates and later tosses land on the stack. Each wad is small, heavy,
   high-damped, and allowed to sleep (`BALL_*`/`PILE_*` in
   `src/core/constants.ts`), so it thuds to a stop and several nestle in the bin
   instead of rolling around. A ball that ended up outside fades out and is
   removed. Whenever the basket slides, every resting ball wakes and gets a
   random kick (`JOLT_*`); most resettle, but the odd one clears the rim, falls
   out, and is culled by the same rule — the pile's "chance to go flying." The
   slide-in kick is held until the basket reaches its visual stop
   (`joltDelayMs`, `src/core/jolt.ts`) — a fraction of the slide, since the
   easeOutExpo curve parks the basket before its nominal end — so the papers fly
   the moment it settles rather than in the dead pause after. The form then
   resets for another round.
6. **Fish it back out.** Click a resting wad in the basket and you can pull it
   back up to re-read it. Picking is a pure DOM screen-space hit-test — every
   resting wad's world pose is projected to a screen rect (`worldPointToScreen`
   in `src/core/screen-to-world.ts`) and the click is matched against those
   rects (`pickBallAt`, `src/core/pick-ball.ts`); the R3F canvas never
   raycasts. The picked note then un-crumples to ~85% flat and flies up to the
   form's old screen spot behind a dimmed scrim, replaying the crumple's own
   eased field backward (`openingT`/`closingT` in `src/core/inspect-crumple.ts`,
   driven each frame by `src/scene/inspected-note.tsx` — a script-driven plane,
   not a physics body). Click anywhere to dismiss: it re-crumples in place and
   is handed straight back to the normal physics toss, so it can settle back
   into the pile or rim out and be culled by the same rule. The whole
   interaction runs on its own little state machine
   (`browsing → opening → open → closing → browsing`,
   `src/core/inspect-machine.ts`), the note stays a read-only snapshot plane the
   entire time (never editable, never DOM), and the DOM form is marked `inert`
   while a note is open.

### Fallbacks

- **`prefers-reduced-motion: reduce`** → the 3D scene and physics toss are
  skipped entirely; the form does an instant fade instead
  (`src/core/animation-mode.ts`).
- **No WebGL2** → same skip, but with a CSS shrink/spin/fly keyframe
  animation standing in for the toss, so the experience still reads as "the
  form got thrown away" without requiring a GPU context.

Mode selection is pure and testable (`pickAnimationMode`), with a thin
`detectAnimationMode()` wrapper that reads `matchMedia` and probes for a
WebGL2 context at runtime (and is SSR-safe — it returns `'instant'` when there
is no `window`).

## Stack

- React 19 + TypeScript (strict), built as a library with [Vite](https://vite.dev/) (`vite build --lib` → ESM) and `tsc` declarations (`.d.ts`)
- [three.js](https://threejs.org/) / [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) / [`@react-three/cannon`](https://github.com/pmndrs/use-cannon) for the 3D scene and physics
- [`html-to-image`](https://github.com/bubkoo/html-to-image) for the DOM → texture snapshot
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- [pnpm](https://pnpm.io/) workspaces (the widget at the repo root, the demo in `apps/demo`)
- [Husky](https://typicode.github.io/husky/) pre-commit hook: `lint-staged`
  (Prettier on staged files) → repo-wide `prettier --check` → `oxlint` → `tsc -b`
  → demo typecheck → `vitest run`

## Repository layout

This repository **is** the publishable widget package (root), with the demo site as a workspace member:

```
your-feedback-matters/        ← the publishable package (root)
  src/
    index.ts                  public entry ('use client' + exports)
    your-feedback-matters.tsx the <YourFeedbackMatters/> component: wires the
                              state machine, the DOM form, the 3D scene (or a
                              fallback), and the snapshot capture
    feedback-form.tsx         the DOM form (configurable fields, Cancel, Toss)
    core/                     pure, dependency-light, unit-tested logic
      rng.ts                  seeded PRNG (mulberry32) — every random choice
                              downstream is derived from one seed, so a toss
                              is fully reproducible given that seed
      feedback-machine.ts     the form's phase state machine + reducer
      fields.ts               the field-config model (FieldConfig, DEFAULT_FIELDS)
      crumple.ts              procedural fold/contract/lump math → CrumpleField
      toss.ts                 ballistic velocity/spin solver, rim-miss logic
      screen-to-world.ts      maps the form's DOM rect into R3F world space,
                              and projects world points/radii back to screen
                              (worldPointToScreen) so resting wads can be picked
      pick-ball.ts            pure screen-space hit-test: which resting wad, if
                              any, a click landed on (basketScreenRect + pickBallAt)
      inspect-machine.ts      the fish-it-back-out phase machine + reducer
                              (browsing → opening → open → closing → browsing)
      inspect-crumple.ts      progress → crumple-t mapping to un-crumple and
                              re-crumple a picked note (openingT / closingT)
      snapshot-filter.ts      strips the form's action buttons from the
                              crumpled-paper snapshot (includeInSnapshot)
      animation-mode.ts       reduced-motion / no-WebGL / full3d selection
      constants.ts            physics & timing tuning knobs
      copy.ts                 all default user-facing strings, in one place
    scene/                    thin React Three Fiber components — consume
                              core/ outputs, render them, stay dumb
      crumple-scene.tsx       top-level scene, phase-driven composition
      crumpling-paper.tsx     snapshot-textured plane, animated via CrumpleField
      paper-ball.tsx          one piled wad: planToss() flight, rest detection,
                              in/out classify, slide jolt, fade-and-cull
      inspected-note.tsx      the fished-out note: a script-driven plane (not a
                              physics body) that un-crumples and flies to the
                              form spot, then re-crumples on dismiss
      wastebasket.tsx         wire-frame basket + compound collider
      ground.tsx              ground plane collider
  apps/demo/                  the demo site (workspace member, GitHub Pages target)
    src/main.tsx              renders <YourFeedbackMatters/>; owns its own global CSS
```

The `core/` modules have no React or Three.js dependency and are TDD'd in
isolation; `scene/` and the top-level components are deliberately thin —
they read state and forward it into `core/` functions rather than
reimplementing any of the math.

## Developing this repo

```bash
./scripts/dev.ts   # install deps, pick a free port (portplz), start the demo, open browser
```

The dev script needs [`portplz`](https://crates.io/crates/portplz)
(`cargo install portplz`) to pick a unique free port, so multiple projects'
dev servers never collide. Or run the steps manually:

```bash
pnpm install
pnpm --filter your-feedback-matters-demo dev   # the demo dev server
pnpm test                                       # the widget test suite (vitest run)
pnpm build                                      # vite build --lib + tsc .d.ts → dist/
pnpm --filter your-feedback-matters-demo build  # the static demo site
```

The test suite covers every pure module in `src/core/` plus the widget's
phase-transition wiring end to end (blank scold, cancel/reopen, capture →
crumple → toss → settle → reset, both fallback modes, the fish-it-back-out
pile-inspect logic, the configurable-fields/copy/`onSubmit`/`poweredBy` API,
and SSR-safe rendering).

## Deploying the demo

Pushing to `main` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
typecheck → test → build the demo → publish `apps/demo/dist/` to GitHub Pages.
