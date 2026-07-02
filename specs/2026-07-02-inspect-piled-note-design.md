# Fish It Back Out — Inspect a Piled Note

**Date:** 2026-07-02
**Status:** Draft for review
**Repo:** https://github.com/timmattison/your-feedback-matters

## Summary

While the feedback form is open, the wastebasket sits bottom-right holding a
pile of previously-tossed wads (see `specs/2026-07-01-crumple-feedback-form-design.md`,
"Paper pile"). This feature lets you **click a resting wad to fish it back out**:
the scene dims behind a lightbox scrim and that wad **un-crumples to ~95% flat**,
flying from its tumbled resting pose up to the form's original screen position,
where it hangs as a slightly-creased, read-only picture of what was written on
it. Click anywhere and it **re-crumples and gets thrown straight back into the
basket** by the normal physics path.

It never becomes DOM and it is never editable — it stays the same
snapshot-textured 3D plane the whole time. The joke holds: you can look at what
you threw away, but it's still going in the bin.

## Decisions (from brainstorm)

| Decision                | Choice                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| When a wad is clickable | Only in the `idle` phase — form open, basket + pile on-screen. Once anything slides to the landing, inert.     |
| What the wad becomes    | The **same snapshot-textured plane**, un-crumpled to `t ≈ 0.05` (~95% flat). Never live DOM, never editable.   |
| Inspect presentation    | **Focused peek**: dim the rest of the scene + form behind one scrim; the pulled note stays bright.             |
| Dismissing              | Click anywhere → re-crumple (`t → 1`) and re-throw via the **existing** `planToss` path; the wad rejoins pile. |
| Click detection         | Pure screen-space pick over a DOM hit-layer scoped to the basket, so the centered form stays fully typeable.   |
| Reduced motion          | No special branch — the 3D scene (and thus this feature) only exists in `full3d`, which already excludes it.   |

## UX Flow / Interaction

The interaction is a small state machine (`src/core/inspect-machine.ts`, pure +
TDD'd) driven by real DOM clicks and animation completions. It runs **only while
the feedback machine is in `idle`**; the two machines never overlap (there is no
active toss during `idle`).

```
browsing ──INSPECT(id)──▶ opening ──OPEN_DONE──▶ open ──DISMISS──▶ closing ──CLOSE_DONE──▶ browsing
```

- **browsing** — nothing pulled. Resting wads in the basket are clickable via the
  basket hit-layer. `noteId = null`.
- **opening** — the picked wad leaves physics and animates: crumple parameter
  `t: 1 → 0.05` while its transform lerps from resting pose to the form's world
  rect (flat, facing camera). The scrim fades in; the DOM form goes `inert`.
- **open** — the note hangs at the form position, read-only. A full-viewport
  dismiss catcher is armed.
- **closing** — on any click, the note re-crumples in place (`t: 0.05 → 1`) at the
  form position, then hands off to a fresh `planToss` back at the basket (a normal
  throw — it can even rim out and be culled, same as any toss). Scrim fades out;
  the form is un-`inert`-ed.

Guards (enforced by the machine, TDD'd): `INSPECT` only acts in `browsing`
(no starting a second inspection mid-animation); `DISMISS` only acts in `open`;
`OPEN_DONE`/`CLOSE_DONE` only advance their own phase; unknown events are no-ops.

## Architecture

### New pure `core/` modules (TDD'd — all logic lives here)

| Module               | Responsibility                                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspect-machine.ts` | The `browsing → opening → open → closing` reducer + guards above. State: `{ phase, noteId }`.                                                                                                                                                                                          |
| `inspect-crumple.ts` | Pure progress→`t` mapping: `openingT(p) = lerp(1, 0.05, ease(p))`, `closingT(p) = lerp(0.05, 1, ease(p))`. Constant `INSPECT_CRUMPLE_T = 0.05`. Reuses the same eased curve family as the crumple.                                                                                     |
| `pick-ball.ts`       | `worldPointToScreen(point, viewport, cam)` + `worldRadiusToScreen(r, …)` (the inverse of `domRectToWorld`), `basketScreenRect(base, mouthHeight, radius, viewport, cam)`, and `pickBallAt(clickPx, balls) → id \| null` (nearest wad under the point, tie-broken front-most by depth). |

The un-crumple **morph itself needs zero new math**: `createCrumpleField(seed,
w, h).sample(u, v, t)` (`src/core/crumple.ts`) already accepts any `t ∈ [0,1]`
and returns the flat sheet at `t ≤ 0`. Un-crumpling is just replaying the field
backward — that is why the scary-sounding part is nearly free.

### Data model changes (`crumple-scene.tsx`)

`PileEntry` currently carries `{ id, geometry, snapshotUrl, startPosition,
ballRadius, seed }`. To rebuild the field for a specific old wad and to animate
it from where it is resting, add:

- `width: number`, `height: number` — the sheet's world dimensions at toss time
  (`worldRect.width/height`), so `createCrumpleField(entry.seed, entry.width,
entry.height)` reconstructs _that wad's_ exact field.
- `restPosition: [number, number, number] | null` and
  `restQuaternion: [number, number, number, number] | null` — the wad's live
  resting pose, `null` until it first settles.

`startPosition` already equals `worldRect.center` (the form's world center), so
the "fly back to where the form was" target is already stored.

### Touched scene / app files (thin glue — visual-verified, per repo convention)

- **`paper-ball.tsx`** — subscribe to `api.quaternion` alongside the existing
  position/velocity subscriptions and, on each rising edge of `restingRef`,
  report the resting pose up via a new `onRestPose(pose)` prop. The scene records
  it on the matching `PileEntry`, so the pile always knows where each clickable
  wad is and how it is oriented. (Existing `onRested`/`onFellOut` behavior is
  unchanged.)
- **`inspected-note.tsx`** (new) — the pulled note. Builds a
  `planeGeometry(entry.width, entry.height, 64, 64)` with the snapshot texture
  (mirroring `CrumplingPaper`), and in `useFrame` accumulates progress over
  `INSPECT_DURATION_S` and morphs the plane vertices via the rebuilt field at
  `openingT`/`closingT(progress)`. **Opening** flies the group from the resting
  pose to `startPosition` (slerping the quaternion to identity — flat, facing
  camera) as it flattens. **Closing** holds the group at `startPosition` and
  re-crumples in place (orientation tumbling toward a throw), after which the
  scene hands off to `planToss` — so the note is chucked back from the form spot
  like a first throw, not walked back to the basket. Calls
  `onOpenDone`/`onCloseDone` at `progress ≥ 1`. Frees its imperatively-created geometry/texture/material on
  unmount, like the rest of the scene.
- **`crumple-scene.tsx`** — owns an `inspect-machine` reducer; renders the
  basket **hit-layer** (a positioned DOM div over `basketScreenRect`, armed only
  when `phase === 'idle'` and inspect phase is `browsing`), the **dismiss
  catcher** (a full-viewport DOM div armed while `open`), the **scrim** (a 3D
  quad, below), and — while a note is pulled — an `InspectedNote` in place of
  that wad's `PaperBall`. Notifies the app via `onInspectingChange(boolean)`.
- **`app.tsx`** — passes `phase` (already does) and, on `onInspectingChange`,
  marks the DOM form `inert` (React 19 native attribute) so it cannot be typed
  into behind the scrim.
- **`scene.css`** — replace the blanket `.scene-overlay * { pointer-events: none
!important }` with targeted control: the canvas stays `pointer-events: none`
  (all picking is DOM-driven, not R3F raycasting), while the hit-layer and
  dismiss catcher opt into `pointer-events: auto` per inspect state.

## Click Detection & Pointer Events

Two sub-modes inside `idle`, resolved entirely with DOM divs and pure math (the
canvas never captures pointer events):

- **browsing** — the form is centered and must stay fully typeable, so the whole
  canvas is _not_ armed. Instead a hit-layer div is positioned over the basket's
  projected screen rect (`basketScreenRect`, bottom-right, clear of the form).
  Its `onClick` reads `clientX/clientY`, and `pickBallAt` chooses the front-most
  resting wad under that point from the pile's projected `restPosition`s
  (`worldPointToScreen`). A hit dispatches `INSPECT(id)`; a miss is a no-op.
- **open** — a transparent full-viewport dismiss catcher is armed; any click
  dispatches `DISMISS`. The form is already `inert`, so no stray input reaches it.

Projection note: wads rest near the `z = 0` plane the `domRectToWorld` mapping
assumes, so projecting `restPosition` through the same mapping is accurate to a
few percent — ample for picking a small corner pile. If real-world occlusion
proves to mis-pick, the fallback is an R3F raycast triggered by the same
hit-layer click; the pure pick is preferred for testability.

## The Dim (one scrim)

The canvas overlay (z-index 10, transparent) composites _over_ the DOM form. So a
single full-viewport translucent dark quad in the 3D scene — drawn after the
basket/pile but before the inspected note (via `renderOrder`, depth-test off) —
dims the basket, the rest of the pile, **and** the form showing through the
transparent canvas all at once, while the pulled note (drawn last, depth-test
off) stays bright. The form's separate `inert` flag handles interactivity; the
quad handles the look.

## Physics

The pulled note leaves physics entirely while inspected — it is a script-driven
(`useFrame`) `InspectedNote`, not a dynamic body, so gravity does not drag it
down. On dismiss it re-enters physics through the **existing** path: the scene
re-mounts a `PaperBall` for that entry (with `startPosition = entry.startPosition
= worldRect.center`, `isActive = false`, its stored `seed`/`geometry`), which
`planToss`es it back to the basket exactly like the first throw and re-settles
into the pile — or misses and is culled by the existing out-of-basket rule.
Because the re-thrown wad is not the active toss, it does **not** fire
`onBallRested`, so the feedback machine (idle) is untouched.

## Reduced Motion & Fallbacks

`detectAnimationMode()` resolves `prefers-reduced-motion: reduce` to the
`instant` mode, which renders **no 3D scene** — there is no pile to click. The
inspect feature is therefore structurally `full3d`-only and needs no separate
reduced-motion branch: within `full3d`, reduced motion is already off. No
WebGL → same story. Nothing to add.

## Testing Strategy

- **TDD (red → commit → green → commit)** for every `core/` module:
  - `inspect-machine.ts`: initial state; `INSPECT` from `browsing` sets
    `opening` + id; `INSPECT` ignored in `opening`/`open`/`closing`; `OPEN_DONE`
    only `opening → open`; `DISMISS` only in `open → closing` (id retained);
    `CLOSE_DONE` only `closing → browsing` (id cleared); unknown event is a no-op.
  - `inspect-crumple.ts`: `openingT(0) === 1`, `openingT(1) === 0.05`,
    monotonic-decreasing, always within `[0.05, 1]`; `closingT` is the mirror.
  - `pick-ball.ts`: `worldPointToScreen` round-trips `domRectToWorld`'s center;
    `pickBallAt` returns `null` outside all wads, the wad under the point, and the
    **front-most** wad on overlap; `basketScreenRect` encloses a wad resting at
    the base.
- **Scene/app components stay logic-free** (`inspected-note.tsx`, the hit-layer,
  the catcher, the scrim, the `inert` wiring) and are verified by running the app
  (claude-in-chrome eyeball + screenshot: pick a wad, watch it un-crumple to the
  form spot, dim behind; click out, watch it re-crumple and get thrown back).
- The existing `app.test.tsx` fully mocks `./scene/crumple-scene`, so this
  feature adds no jsdom/WebGL requirements to the suite. All tests stay
  parallel-safe (no fixed shared resources; jsdom only).

## Phases (plan skeleton — detailed plan lives in `plans/`)

1. **Pure core** — `inspect-machine.ts`, `inspect-crumple.ts`, `pick-ball.ts`
   (incl. `world*ToScreen`, `basketScreenRect`) under TDD; `INSPECT_CRUMPLE_T` /
   `INSPECT_DURATION_S` constants.
2. **Data + pose reporting** — extend `PileEntry` (`width`/`height`/`restPose`);
   `PaperBall` reports resting pose via `onRestPose`.
3. **Un-crumple animation** — `inspected-note.tsx`; scene swaps the picked wad's
   `PaperBall` for an `InspectedNote` and animates open.
4. **Interaction + lightbox** — hit-layer + `pickBallAt` wiring, dismiss catcher,
   scrim quad, `onInspectingChange` → form `inert`, `scene.css` pointer-events
   rework.
5. **Re-throw + polish** — close animation → re-mounted `PaperBall`/`planToss`;
   visual pass in-browser; README + the 2026-07-01 spec's "Paper pile" section
   updated to mention fishing a note back out.

## Non-Goals

- **No editing.** The pulled note is a picture; there is no path back to a live
  form. (That was an explicit brainstorm decision.)
- **No persistence.** Fished-out notes are the same in-memory wads; nothing is
  stored. The whole app has no backend — that's the joke.
- **No multi-select / gallery.** One note inspected at a time.
- **No new fallback renderer.** The feature simply doesn't exist outside `full3d`.

## Risks

- **Hit-layer vs. form clicks** — the one genuinely fiddly bit; mitigated by
  scoping the armed region to the basket rect and keeping the canvas inert.
  Validated first in Phase 4, with the R3F-raycast fallback noted above.
- **Scrim depth ordering** — dimming everything _except_ the note is handled by
  `renderOrder` + depth-test off rather than z-fighting; confirmed visually.
