# Your Feedback Matters

A feedback form with exactly one honest feature: **your feedback is never
stored anywhere.** The page opens on a single **"Got feedback?"** button;
click it and a wire wastebasket slides in from the right while the form
appears. Type a Name and a Comment, hit **"Circular file, in style,"** and
watch the form snapshot itself, crumple into a lumpy paper ball, and get
physically tossed at that wastebasket. About a quarter of throws rim out and
roll away, because that's how throwing paper at a trash can actually goes.
Made shots **stay** — the paper piles up in the basket across submissions,
and only the ones that miss (or later get knocked out) actually disappear.
When the basket slides back out and in, the pile gets jostled, so every now
and then a wad hops the rim and goes flying. After each toss you're returned
to the **"Got feedback?"** landing. Click any wad that made it into the basket
and you can fish it back out: the scene and form dim behind a dark scrim, that
note un-crumples and floats up to where the form used to be so you can re-read
what you wrote. Click anywhere and it re-crumples on the spot and gets thrown
straight back into the bin. It's read-only the whole time — the note never
becomes editable and nothing you typed is ever stored. That's the whole
product. That's the joke.

Leave a field blank and hit toss anyway, and the form shakes and scolds you
in red: _"Be serious, there's nothing we can do if your feedback is
blank"._ Hit **Cancel** and the form politely closes and the basket slides
away, back to the **"Got feedback?"** button. Either way, nothing you type is
ever sent, saved, logged, or read by anyone. There is no backend.

![A feedback form crumples into a paper ball and is tossed into a wire wastebasket](./docs/crumple-toss.gif)

## How it works

1. **Fill the form.** Name + Comment, client-side only, held in a small
   state machine (`closed → idle → error → capturing → crumpling → tossing →
settling → closed`, see `src/core/feedback-machine.ts`). The app lands in
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
   raycasts. The picked note then un-crumples to ~95% flat and flies up to the
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
WebGL2 context at runtime.

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript (strict)
- [three.js](https://threejs.org/) / [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber) / [`@react-three/cannon`](https://github.com/pmndrs/use-cannon) for the 3D scene and physics
- [`html-to-image`](https://github.com/bubkoo/html-to-image) for the DOM → texture snapshot
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- [pnpm](https://pnpm.io/) as the package manager
- [Husky](https://typicode.github.io/husky/) pre-commit hook: `lint-staged`
  (Prettier on staged files) → repo-wide `prettier --check` → `tsc -b` →
  `vitest run`

## Getting started

```bash
./scripts/dev.ts   # install deps, pick a free port (portplz), start Vite, open browser
```

The dev script needs [`portplz`](https://crates.io/crates/portplz)
(`cargo install portplz`) to pick a unique free port, so multiple projects'
dev servers never collide. Or run the steps manually:

```bash
pnpm install
pnpm dev       # local dev server
pnpm test      # run the test suite (vitest run)
pnpm build     # tsc -b && vite build → dist/
```

113 tests currently cover every pure module in `src/core/` plus the app's
phase-transition wiring end to end (blank scold, cancel/reopen, capture →
crumple → toss → settle → reset, both fallback modes, and the fish-it-back-out
pile-inspect logic — screen-space picking, un-crumple/re-crumple mapping, and
the inspect state machine).

## Architecture

```
src/
  core/                    pure, dependency-light, unit-tested logic
    rng.ts                 seeded PRNG (mulberry32) — every random choice
                            downstream is derived from one seed, so a toss
                            is fully reproducible given that seed
    feedback-machine.ts    the form's phase state machine + reducer
    crumple.ts             procedural fold/contract/lump math → CrumpleField
    toss.ts                ballistic velocity/spin solver, rim-miss logic
    screen-to-world.ts     maps the form's DOM rect into R3F world space,
                            and projects world points/radii back to screen
                            (worldPointToScreen) so resting wads can be picked
    pick-ball.ts           pure screen-space hit-test: which resting wad, if
                            any, a click landed on (basketScreenRect + pickBallAt)
    inspect-machine.ts     the fish-it-back-out phase machine + reducer
                            (browsing → opening → open → closing → browsing)
    inspect-crumple.ts     progress → crumple-t mapping to un-crumple and
                            re-crumple a picked note (openingT / closingT)
    snapshot-filter.ts     strips the form's action buttons from the
                            crumpled-paper snapshot (includeInSnapshot)
    animation-mode.ts      reduced-motion / no-WebGL / full3d selection
    constants.ts           physics & timing tuning knobs
    copy.ts                all user-facing strings, in one place

  scene/                   thin React Three Fiber components — consume
                            core/ outputs, render them, stay dumb
    crumple-scene.tsx      top-level scene, phase-driven composition
    crumpling-paper.tsx    snapshot-textured plane, animated via CrumpleField
    paper-ball.tsx         one piled wad: planToss() flight, rest detection,
                            in/out classify, slide jolt, fade-and-cull
    inspected-note.tsx     the fished-out note: a script-driven plane (not a
                            physics body) that un-crumples and flies to the
                            form spot, then re-crumples on dismiss
    wastebasket.tsx        wire-frame basket + compound collider
    ground.tsx             ground plane collider

  feedback-form.tsx        the DOM form (Name, Comment, Cancel, Toss)
  app.tsx                  app shell: wires the state machine, the DOM
                            form, the 3D scene (or a fallback), and the
                            snapshot capture, per the resolved animation mode
  main.tsx                 React root
```

The `core/` modules have no React or Three.js dependency and are TDD'd in
isolation; `scene/` and the top-level components are deliberately thin —
they read state and forward it into `core/` functions rather than
reimplementing any of the math.

## Docs

- Design spec: [`specs/2026-07-01-crumple-feedback-form-design.md`](./specs/2026-07-01-crumple-feedback-form-design.md)
- Implementation plan: [`plans/2026-07-01-crumple-feedback-form-plan.md`](./plans/2026-07-01-crumple-feedback-form-plan.md)
- Fish-it-back-out design spec: [`specs/2026-07-02-inspect-piled-note-design.md`](./specs/2026-07-02-inspect-piled-note-design.md)
- Fish-it-back-out implementation plan: [`plans/2026-07-02-inspect-piled-note-plan.md`](./plans/2026-07-02-inspect-piled-note-plan.md)
- Ideas not yet built: [`WISHLIST.md`](./WISHLIST.md)

## Deploying

Pushing to `main` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
typecheck → test → build → publish `dist/` to GitHub Pages.
