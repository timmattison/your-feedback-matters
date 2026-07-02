# Plan: Fish It Back Out — Inspect a Piled Note

> Source spec: [`specs/2026-07-02-inspect-piled-note-design.md`](../specs/2026-07-02-inspect-piled-note-design.md)
> Prior art: [`specs/2026-07-01-crumple-feedback-form-design.md`](../specs/2026-07-01-crumple-feedback-form-design.md) ("Paper pile")

Click a resting wad in the wastebasket to fish it back out: the scene dims behind a
scrim, the wad un-crumples to ~95% flat and flies up to the form's old screen
position as a read-only snapshot picture. Click anywhere and it re-crumples and gets
thrown straight back into the basket by the normal physics path. It never becomes DOM
and is never editable.

## Derived user stories

The source is a design spec, so these were derived from its Summary / UX Flow:

- **US1** — Click a resting wad in the basket to fish it back out.
- **US2** — The fished note un-crumples and flies up to where the form was, so you can read what you wrote.
- **US3** — The rest of the scene + form dims (focused peek) so the pulled note stands out.
- **US4** — Click anywhere to send the note re-crumpling back into the basket.
- **US5** — (constraint) The note is never editable / never DOM — it stays the same snapshot-textured plane.
- **US6** — (constraint) The centered form stays fully typeable while browsing; the basket hit-layer must not steal form clicks.

---

## Architectural decisions

Durable decisions that apply across all phases. Two were resolved by recommendation
while the requester was away (marked ⚑) — revisit if desired before Phase 1.

### Modules & file layout

- **New pure `core/` modules (TDD'd):**
  - `inspect-machine.ts` — the interaction reducer + guards.
  - `inspect-crumple.ts` — progress→`t` mapping for un-crumple / re-crumple.
  - `pick-ball.ts` — `basketScreenRect(...)` and `pickBallAt(clickPx, balls) → id | null`.
- ⚑ **Inverse-projection helpers live in the existing `src/core/screen-to-world.ts`**, next
  to `domRectToWorld` (their exact inverse), not in `pick-ball.ts` as the spec text
  literally lists them. New exports there: `worldPointToScreen(point, viewport, cam)`
  and `worldRadiusToScreen(r, viewport, cam)`. `pick-ball.ts` imports them. Rationale:
  keeps the whole screen↔world projection domain in one already-TDD'd module; avoids a
  second home for the same math. _(Alternative, per spec: put all four in `pick-ball.ts`.)_
- **New scene component:** `src/scene/inspected-note.tsx` — the pulled note; a
  script-driven (`useFrame`) plane, **not** a physics body.
- **Touched glue (visual-verified, per repo convention):** `src/scene/crumple-scene.tsx`,
  `src/scene/paper-ball.tsx`, `src/app.tsx`, `src/scene/scene.css`.

### State machine (`inspect-machine.ts`)

- **State:** `{ phase: InspectPhase, noteId: number | null }`.
- **Phases:** `browsing → opening → open → closing → browsing`.
- **Events:** `INSPECT(id)`, `OPEN_DONE`, `DISMISS`, `CLOSE_DONE`.
- **Transitions:** `INSPECT` only in `browsing` (→ `opening`, sets `noteId`);
  `OPEN_DONE` only `opening → open`; `DISMISS` only `open → closing` (id retained);
  `CLOSE_DONE` only `closing → browsing` (id cleared). Unknown / wrong-phase events are
  no-ops returning the **same object reference** (mirrors `feedback-machine.ts`).
- Runs **only while the feedback machine is in `idle`** — the two machines never overlap
  (there is no active toss during `idle`).

### Crumple mapping (`inspect-crumple.ts`)

- `INSPECT_CRUMPLE_T = 0.05` (~95% flat), `INSPECT_DURATION_S` (new constants in `constants.ts`).
- `openingT(p) = lerp(1, 0.05, ease(p))`, `closingT(p) = lerp(0.05, 1, ease(p))`, reusing the
  same eased curve family as the crumple (`easeInOutCubic`). Both always within `[0.05, 1]`;
  `openingT` monotonic-decreasing, `closingT` its mirror.
- **The morph needs zero new field math:** `createCrumpleField(seed, w, h).sample(u, v, t)`
  already accepts any `t ∈ [0,1]`; un-crumpling just replays the field backward.

### Data model (`PileEntry` in `crumple-scene.tsx`)

Extend the existing `{ id, geometry, snapshotUrl, startPosition, ballRadius, seed }` with:

- `width: number`, `height: number` — the sheet's world dims at toss time
  (`worldRect.width/height`), so `createCrumpleField(entry.seed, entry.width, entry.height)`
  reconstructs _that wad's_ exact field.
- `restPosition: [number, number, number] | null`, `restQuaternion: [number, number, number, number] | null`
  — the wad's live resting pose, `null` until it first settles.
- `startPosition` already equals `worldRect.center` (the form's world center), so the
  fly-back target is already stored.

### Click detection & pointer events

- All picking is **DOM-driven, pure screen-space** — the R3F canvas never captures pointer
  events (no raycasting). Two DOM divs inside `idle`:
  - **basket hit-layer** — positioned over `basketScreenRect`; armed only when feedback
    `phase === 'idle'` **and** inspect `phase === 'browsing'`. `onClick` reads
    `clientX/clientY`; `pickBallAt` chooses the front-most resting wad (nearest under the
    point, tie-broken front-most by depth) from the pile's projected `restPosition`s. Hit →
    `INSPECT(id)`; miss → no-op.
  - **dismiss catcher** — transparent, full-viewport; armed while inspect `phase === 'open'`.
    Any click → `DISMISS`.
- `scene.css`: replace the blanket `.scene-overlay * { pointer-events: none !important }`
  with targeted control — canvas stays `pointer-events: none`; hit-layer and catcher opt
  into `pointer-events: auto` per inspect state.
- **Fallback (documented, not built):** if the pure pick mis-picks under real occlusion,
  swap `pickBallAt` for an R3F raycast triggered by the same hit-layer click.

### The dim (one scrim)

A single full-viewport translucent dark **3D quad**, drawn after basket/pile but before the
inspected note (`renderOrder`, depth-test off). Because the transparent canvas composites
over the DOM form, this one quad dims the basket, the rest of the pile, **and** the form
showing through — all at once — while the pulled note (drawn last, depth-test off) stays
bright. The form's separate `inert` flag handles interactivity; the quad handles the look.

### Physics / re-throw

- The pulled note **leaves physics entirely** while inspected (script-driven `InspectedNote`,
  not a dynamic body — gravity does not drag it down).
- On dismiss it re-enters via the **existing** path: the scene re-mounts a `PaperBall` for
  that entry (`startPosition = entry.startPosition`, `isActive = false`, stored `seed`/`geometry`),
  which `planToss`es it back to the basket like a first throw and re-settles — or misses and
  is culled by the existing out-of-basket rule.
- Because the re-thrown wad is **not** the active toss, it does **not** fire `onBallRested`,
  so the feedback machine (idle) is untouched.

### Reduced motion / fallbacks

- Structurally `full3d`-only: `instant` (reduced-motion / no-WebGL) renders no 3D scene, so
  there is no pile to click. **No separate reduced-motion branch, no new fallback renderer.**

### Testing

- **TDD (red → commit → green → commit)** for every `core/` module, sibling `<name>.test.ts`,
  Vitest globals (`test`/`expect`/`vi` unmarked), jsdom, seed-deterministic, side-effect-free —
  matching `feedback-machine.ts` / `jolt.ts` / `screen-to-world.ts`.
- **Scene/app components stay logic-free** (`inspected-note.tsx`, hit-layer, catcher, scrim,
  `inert` wiring) — verified in-browser (claude-in-chrome eyeball + screenshot).
- `app.test.tsx` already fully mocks `./scene/crumple-scene` (captures props into
  `sceneProps.current`), so the new `onInspectingChange`/`inert` wiring is exercised through
  the mocked prop — no jsdom/WebGL added to the suite. All tests parallel-safe.
- Commands: tests `pnpm test` (`vitest run`), typecheck `pnpm typecheck` (`tsc -b`), lint
  `pnpm lint` (`oxlint`).

---

## Phase 1: Pure core foundation (TDD)

**User stories**: enables US1, US4 (and the fly/morph math for US2)

### What to build

The full testable substrate, no visible behavior yet. Every module is red→commit→green→commit
with a sibling Vitest test, following the repo's pure-`core/` convention.

- `inspect-machine.ts` — the `{ phase, noteId }` reducer with all guards.
- `inspect-crumple.ts` — `openingT` / `closingT` and `INSPECT_CRUMPLE_T`.
- `pick-ball.ts` — `basketScreenRect(base, mouthHeight, radius, viewport, cam)` and
  `pickBallAt(clickPx, balls) → id | null`.
- `screen-to-world.ts` — add `worldPointToScreen` and `worldRadiusToScreen` (the inverse of
  `domRectToWorld`).
- `constants.ts` — add `INSPECT_CRUMPLE_T = 0.05` and `INSPECT_DURATION_S` (data-only, no test,
  matching `constants.ts` convention).

### Acceptance criteria

- [ ] `inspect-machine`: initial state is `{ phase: 'browsing', noteId: null }`; `INSPECT(id)`
      from `browsing` → `{ opening, id }`; `INSPECT` ignored in `opening`/`open`/`closing`;
      `OPEN_DONE` only `opening → open`; `DISMISS` only `open → closing` (id retained);
      `CLOSE_DONE` only `closing → browsing` (id cleared); unknown / wrong-phase events return
      the same object reference.
- [ ] `inspect-crumple`: `openingT(0) === 1`, `openingT(1) === 0.05`, monotonic-decreasing,
      always within `[0.05, 1]`; `closingT(0) === 0.05`, `closingT(1) === 1`, the mirror.
- [ ] `screen-to-world`: `worldPointToScreen` round-trips `domRectToWorld`'s center (project a
      known world center back to the original screen pixel, within float tolerance);
      `worldRadiusToScreen` scales a world radius to the matching pixel radius.
- [ ] `pick-ball`: `pickBallAt` returns `null` when the point is outside all wads, the wad's id
      when the point is inside one, and the **front-most** wad on overlap; `basketScreenRect`
      encloses a wad resting at the basket base.
- [ ] Every new `core/` module has its red commit before its green commit; `pnpm test`,
      `pnpm typecheck`, `pnpm lint` all green.

---

## Phase 2: Resting-pose data pipeline

**User stories**: US1, US2

### What to build

Give the pile the live data the pick math and the fly-back animation need: where each
clickable wad is resting and how it is oriented.

- Extend `PileEntry` with `width`, `height`, `restPosition`, `restQuaternion` (populate
  `width`/`height` from `worldRect` at append time; `restPosition`/`restQuaternion` start `null`).
- `PaperBall` subscribes to `api.quaternion` alongside position/velocity and, on each **rising
  edge** of `restingRef`, reports the resting pose up via a new `onRestPose(pose)` prop. Existing
  `onRested` / `onFellOut` behavior is unchanged.
- The scene records the reported pose onto the matching `PileEntry`.

### Acceptance criteria

- [ ] After a toss settles, the wad's `PileEntry` carries a non-null `restPosition` /
      `restQuaternion` and the correct `width` / `height`.
- [ ] `onRestPose` fires on the rising edge of resting (once per settle), not every frame, and
      not for a wad that never settles.
- [ ] Existing toss → rest → pile behavior (including fall-out culling and the slide jolt) is
      unchanged; `onRested` / `onFellOut` fire exactly as before.
- [ ] Verified in-browser: projecting each resting wad's `restPosition` through
      `worldPointToScreen` lands on the wad's on-screen location (temporary debug overlay/log,
      removed before the phase's final commit).
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` green.

---

## Phase 3: Click-to-open (open half)

**User stories**: US1, US2, US3, US6

### What to build

The complete "fish it up" half, demoable on its own: pick a wad and watch it fly up,
un-crumple, and hang at the form's old spot behind a dimmed scene. Dismiss lands in Phase 4;
until then the note simply stays open.

- Scene owns an `inspect-machine` reducer.
- **Basket hit-layer**: a positioned DOM div over `basketScreenRect`, armed only when feedback
  `phase === 'idle'` **and** inspect `phase === 'browsing'`; `onClick` → `pickBallAt` over the
  pile's projected `restPosition`s → `INSPECT(id)` on a hit, no-op on a miss.
- **`inspected-note.tsx`** (new): builds `planeGeometry(entry.width, entry.height, 64, 64)` with
  the snapshot texture (mirroring `CrumplingPaper`); in `useFrame` accumulates progress over
  `INSPECT_DURATION_S` and morphs vertices via the rebuilt field at `openingT(progress)`, flying
  the group from the resting pose to `startPosition` while slerping the quaternion to identity
  (flat, facing camera). Calls `onOpenDone` at `progress ≥ 1`. Frees its imperatively-created
  geometry/texture/material on unmount.
- Scene swaps the picked wad's `PaperBall` for an `InspectedNote` while a note is pulled.
- **Scrim**: a full-viewport dark 3D quad drawn after basket/pile, before the note (`renderOrder`,
  depth-test off); the note is drawn last, depth-test off, staying bright.
- Scene notifies the app via `onInspectingChange(true)`; `app.tsx` marks the DOM form `inert`.
- **`scene.css`**: replace the blanket `pointer-events: none !important` with targeted control —
  canvas stays `none`; the hit-layer opts into `pointer-events: auto` when armed.

### Acceptance criteria

- [ ] Clicking a resting wad in the pile (while the form is open/idle) makes that wad leave the
      pile and animate up to the form's old screen position, un-crumpling to ~95% flat over
      `INSPECT_DURATION_S`, facing the camera.
- [ ] The scene, basket, rest of the pile, and the form behind the canvas all dim; the pulled
      note stays bright.
- [ ] The form cannot be typed into while a note is open (it is `inert`).
- [ ] While browsing, the centered form remains fully typeable — the hit-layer only covers the
      basket rect and does not intercept form clicks (US6).
- [ ] Clicking empty space inside the basket rect (no wad under the point) does nothing.
- [ ] Verified in-browser (screenshot: pick a wad → un-crumple to the form spot → dim behind).
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` green.

---

## Phase 4: Dismiss + re-throw (close half)

**User stories**: US4, US5

### What to build

Close the loop: click out, watch the note re-crumple in place and get chucked back into the
basket by the normal physics path.

- **Dismiss catcher**: a transparent full-viewport DOM div armed while inspect `phase === 'open'`;
  any click → `DISMISS`.
- `InspectedNote` **closing**: holds the group at `startPosition` and re-crumples in place
  (`closingT(progress)`, orientation tumbling toward a throw), calling `onCloseDone` at
  `progress ≥ 1`.
- On `onCloseDone`, the scene re-mounts a `PaperBall` for that entry (`startPosition =
entry.startPosition`, `isActive = false`, stored `seed`/`geometry`), which `planToss`es it
  back into the basket exactly like a first throw and re-settles into the pile — or misses and
  is culled by the existing out-of-basket rule.
- Scrim fades out; `onInspectingChange(false)` → app un-`inert`s the form.

### Acceptance criteria

- [ ] With a note open, clicking anywhere re-crumples it in place (`0.05 → 1`) at the form spot,
      then throws it back toward the basket.
- [ ] The re-thrown wad follows the normal `planToss` path — it can settle into the pile **or**
      rim out and be culled, same as any toss.
- [ ] The re-thrown wad does **not** fire `onBallRested`; the feedback machine stays in `idle`
      throughout.
- [ ] After dismiss the scrim is gone and the form is typeable again; the inspect machine is back
      in `browsing` and another wad can be fished out.
- [ ] The note is never editable and never becomes DOM at any point in the round trip (US5).
- [ ] Verified in-browser (screenshot/GIF: full round trip — pick, read, click out, re-crumple,
      thrown back).
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` green.

---

## Phase 5: Polish + docs

**User stories**: all (hardening + honest docs)

### What to build

Tune the feel, cover the edges, and update the docs so the pile section tells the whole joke.

- Visual tuning: `INSPECT_DURATION_S`, ease curve, scrim opacity, and scrim/note depth ordering
  (dim everything _except_ the note without z-fighting).
- Edge cases: rapid double-clicks (guarded by the machine — no second inspection mid-animation);
  clicking the basket rect with an empty or fully-fallen-out pile (no-op); inspecting works after
  several tosses have piled up.
- `app.test.tsx`: add coverage for the `onInspectingChange` → form `inert` wiring via the existing
  mocked-scene props (`sceneProps.current?.onInspectingChange(true/false)` in `act`).
- Docs: update `README` and the `specs/2026-07-01-crumple-feedback-form-design.md` "Paper pile"
  section to mention fishing a note back out.

### Acceptance criteria

- [ ] Rapid clicks never start a second inspection or leave the scene wedged; the guards hold
      under mashing.
- [ ] Empty-basket / all-fallen-out clicks are no-ops; the feature behaves after many piled tosses.
- [ ] The inspect duration, ease, and scrim read well in-browser (screenshot before/after);
      nothing z-fights.
- [ ] `app.test.tsx` asserts the form goes `inert` on inspect-open and un-`inert` on dismiss.
- [ ] README + 2026-07-01 spec "Paper pile" section mention the fish-it-back-out interaction.
- [ ] Full suite green: `pnpm test`, `pnpm typecheck`, `pnpm lint`.

---

## Open decisions (defaulted while away — revisit if desired)

1. **Phase 3–4 split** — defaulted to the **vertical open/close** cut above (each half demoable).
   Alternatives: the spec's horizontal _animation / interaction_ cut, or merging 3+4 into one
   "full interaction" phase (4 phases total).
2. **Projection-helper home** — defaulted to putting `worldPointToScreen` /
   `worldRadiusToScreen` in `screen-to-world.ts` (next to `domRectToWorld`). Alternative: all
   four helpers in `pick-ball.ts`, exactly as the spec text lists them.
