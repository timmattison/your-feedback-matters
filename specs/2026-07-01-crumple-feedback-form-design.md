# Your Feedback Matters — Crumple-and-Toss Feedback Form

**Date:** 2026-07-01
**Status:** Draft for review
**Repo:** https://github.com/timmattison/your-feedback-matters

## Summary

A standalone React app that presents a feedback form (name + comment). The
"Circular file, in style" button crumples the form — visually, as real paper —
into an imperfect ball and tosses it at a wastebasket, occasionally missing.
Cancel closes the form immediately and clears it. Blank submissions get a shake
and a red scolding. The bottom-right corner carries a "Powered by Your Feedback
Matters" badge linking to the GitHub repo.

The joke is the product: your feedback matters, straight into the circular file.

## Decisions (from brainstorm)

| Decision          | Choice                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Deliverable shape | Standalone Vite + React + TypeScript app (component stays extractable)                                              |
| Crumple visual    | Snapshot the real filled-out form as a texture; white-paper fallback                                                |
| The toss          | Visible wastebasket; ball occasionally rims out and rolls away (~25%)                                               |
| Crumple technique | Procedural CPU vertex deformation (pure, seeded, testable); physics only for the toss (confirmed by Tim 2026-07-01) |
| Blank-check rule  | Error if EITHER name or comment is blank after trimming (confirmed by Tim 2026-07-01)                               |

Key physics reality: cannon (`@react-three/cannon`) is a rigid-body engine and
cannot deform a mesh. So the crumple is procedural mesh deformation, and cannon
takes over once the sheet has become a ball: ballistic arc, tumble, rim
bounces, the miss.

## Stack

- Vite, React, TypeScript (strict), pnpm
- `@react-three/fiber`, `three`, `@react-three/cannon` (physics for the toss)
- `html-to-image` (DOM form → texture snapshot)
- vitest + @testing-library/react; husky + lint-staged pre-commit (eslint, tsc, vitest)

## UX Flow / State Machine

A pure reducer (`src/core/feedback-machine.ts`), fully unit-tested. The app
starts in `closed` (the "Got feedback?" landing; form hidden, basket
off-screen):

```
closed ──"Got feedback?"──▶ idle             (basket slides in)
idle ──Cancel──▶ closed                      (fields cleared; basket slides out)
idle ──Toss, either field blank──▶ error ──shake ends──▶ idle
idle ──Toss, both fields filled──▶ capturing ──▶ crumpling ──▶ tossing ──▶ settling ──▶ closed (landing; basket slides out)
```

- **closed**: form hidden; the basket overlay is slid off-screen; a "Got
  feedback?" button summons both. This is the initial and post-toss state.
- **idle**: form editable. Two buttons: **Cancel** and **Circular file, in style**.
- **error**: CSS shake (~500 ms) + red text, exactly:
  `Be serious, there's nothing we can do if your feedback is blank`.
  The message clears when the user edits a field.
- **capturing**: `html-to-image` snapshots the form node to a texture. The DOM
  form hides on the same frame the textured 3D plane appears in its exact
  screen position — a seamless swap. On snapshot failure: plain white paper
  with faint ruled lines (the flip-to-blank fallback).
- **crumpling**: deformation parameter t animates 0→1 over ~1.1 s (eased).
- **tossing**: rigid body gets a computed impulse + random torque toward the
  basket. ~25% of throws (seeded) hit the rim and roll away off-screen.
- **settling**: ball rests in basket (or exits viewport); after a beat it fades
  and is removed, then the machine returns to `closed` — the basket slides
  back out to the "Got feedback?" landing. Repeatable forever.

## Architecture

```
src/
  app.tsx                    layout, footer badge, state-machine orchestration
  feedback-form.tsx          DOM form; ref for snapshot; shake CSS; error text
  scene/
    crumple-scene.tsx        full-viewport transparent R3F <Canvas> overlay
                             (pointer-events: none), <Physics> world
    paper.tsx                64×64-segment plane; texture; useFrame drives the
                             crumple field; hands off to a dynamic sphere body
    wastebasket.tsx          visible wire basket + static compound collider
                             (ring of boxes + floor disc)
  core/                      ← all pure, no React/three imports, fully TDD'd
    crumple.ts               createCrumpleField(seed) → (u, v, t) → [x, y, z]
    toss.ts                  planToss(seed, from, basket) → {impulse, torque, willMiss}
    feedback-machine.ts      reducer state machine above
    rng.ts                   seeded PRNG (mulberry32)
    screen-to-world.ts       DOM rect ↔ world-plane size given camera FOV/distance
```

Deep-module intent: `crumple.ts` exposes one factory; all fold/noise/ball math
is hidden behind it. The R3F components stay thin — they only sample pure
functions and push results into buffers, so everything interesting is testable
without a GPU.

## Crumple Math (the imperfect ball)

`createCrumpleField(seed)` composes three effects, blended over t:

1. **Fold planes** — 8–12 seeded random planes through the sheet. Each fold
   rotates vertices on one side about the crease line, with sharpness ramping
   in over its own sub-window of t → progressive, sharp, papery facets.
2. **Noise displacement** — layered value noise along the sheet normal for
   organic lumps between creases.
3. **Ball attraction** — vertices lerp toward a sphere parameterization whose
   per-vertex radius carries seeded jitter (±20%) → a lumpy, dented ball, never
   a perfect sphere.

Weights animate: folds dominate early/mid; ball attraction dominates late.
Normals are recomputed each frame for correct shading of creases.

Property tests (vitest, deterministic by seed):

- t = 0 is the identity (flat sheet).
- Bounding radius shrinks monotonically in t (sampled).
- Final bounding radius within [rMin, rMax] design bounds.
- Radius variance at t = 1 above an imperfection threshold (never a perfect ball).
- Same seed → identical output; different seeds → measurably different shapes.

## Toss, Basket, Miss

- At t = 1 the crumpled mesh is parented to a dynamic cannon sphere body
  (radius = final ball radius) and follows its transform.
- `planToss` solves the ballistic arc (pick a flight time, derive impulse) from
  the form's position to the basket mouth; adds random torque for tumble.
- **Miss path**: `willMiss` (seeded, p ≈ 0.25) offsets the target to the rim;
  the ball bounces off and rolls/tumbles off-screen. Comedy is physics-driven,
  not keyframed.
- Basket: bottom-right of the viewport; simple wire-basket look; collider is a
  static compound (ring of thin boxes + floor disc) so rim bounces work.

## Error Handling & Degradation

- Snapshot failure → white ruled paper texture; crumple proceeds.
- WebGL unavailable → CSS-only fallback: the form shrinks, spins, and flies
  toward the corner, then resets. Same state machine, different renderer.
- `prefers-reduced-motion` → skip crumple/toss; brief fade, instant reset.

## Footer Badge

Fixed bottom-right: `Powered by Your Feedback Matters` linking to
https://github.com/timmattison/your-feedback-matters. Rendered on a frosted
pill (legible over the steel basket and in dark mode) and shown only once the
form is open — it fades in with the basket and is hidden on the closed "Got
feedback?" landing. Sits above the canvas overlay.

## Testing Strategy

- **TDD (red → commit → green → commit)** for all `core/` modules and all form
  behavior (cancel clears+closes, blank toss shakes + shows exact message,
  message clears on edit, filled toss dispatches capture, post-toss reset).
- R3F components stay logic-free; visuals verified by running the app
  (Playwright / claude-in-chrome for an end-to-end eyeball + screenshot pass).
- Pre-commit: eslint, `tsc --noEmit`, `vitest run` via husky.
- All tests parallel-safe: no fixed ports, no shared temp files (jsdom only).

## Phases (plan skeleton — detailed plan lives in plans/)

1. **Scaffold + DOM form (tracer bullet)** — Vite/TS/pnpm/vitest/husky; form,
   validation shake, cancel, footer badge; deployable static page.
2. **Crumple core math** — pure `crumple.ts`, `rng.ts` under TDD.
3. **Scene + snapshot + crumple** — R3F overlay, screen-to-world alignment,
   seamless DOM→texture swap, crumple animation.
4. **Physics toss** — cannon world, basket + collider, `toss.ts`, miss path,
   settle/reset loop.
5. **Fallbacks + polish + ship** — reduced-motion & no-WebGL paths, timing
   polish, README, GitHub Pages deploy.

## Non-Goals

- No backend; feedback is never stored (that's the joke).
- No npm package publishing (extractable later if wanted).
- No sound effects (candidate for WISHLIST.md).
