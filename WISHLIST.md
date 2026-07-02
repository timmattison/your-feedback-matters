# Wishlist

Ideas that are out of scope for the current build but worth coming back to.

- **Paper sound effects** — a crinkle/rustle while the sheet crumples
  (`src/core/crumple.ts` drives the deformation over `CRUMPLE_DURATION_S`,
  a natural cue point to trigger audio), and a swish-into-the-basket vs.
  clang-off-the-rim sound on landing, keyed off `TossPlan.willMiss` from
  `src/core/toss.ts` so the sound always matches what actually happens.
- **Basket score counter** — track makes vs. misses across a session (e.g.
  "7/9 in the basket") using the existing `BALL_RESTED` /
  `SETTLE_FINISHED` transitions in `src/core/feedback-machine.ts` as the
  scoring hook, without ever persisting the _feedback content_ itself —
  only the tally, keeping the "nothing is stored" joke intact.
- **Extract `<YourFeedbackMatters />` as an npm package** — the pure
  `src/core/` modules (rng, feedback-machine, crumple, toss,
  screen-to-world, animation-mode) are already dependency-free and
  independently tested; package the whole widget as a drop-in React
  component (`<YourFeedbackMatters onSubmit={...} />`) so other projects
  can embed "ceremonial delete" as a feedback UI.
- **Predecode/share the crumple texture** — avoid the decode flash at the
  form→paper and paper→ball handoff seams.
- **Speed up / dress up the snapshot capture** — `html-to-image` takes
  ~2–4 s on the first toss (font inlining), during which the form sits
  visibly grayed. Options: pre-warm the capture pipeline on first
  interaction, skip font embedding, or lean into it with a brief
  "crumpling…" affordance.
- **Brighten the paper at the swap seam** — the snapshot-textured plane
  renders with a gray lighting tint next to the white page (standard
  material + ACES tone mapping). Boost light intensity or use an unlit
  material at t≈0 so the DOM→paper swap is truly seamless.
- **Keep the basket fully inside wide viewports** — on very wide windows
  the wire basket is partially clipped by the right edge (bonus: the
  footer badge overlaps it). Same placement-clamp work as the mobile item.
- **Improve the README GIF** — `docs/crumple-toss.gif` is a 6-frame
  capture from browser automation; a smooth screen recording (one make,
  one rim-out) would show the physics off properly.
- **Clamp basket placement on narrow/mobile viewports** — it currently
  overlaps the form.
- **Replace the reducer's `default:` case with a `never` exhaustiveness
  check** in `src/core/feedback-machine.ts`.
- **`useCallback` the scene callbacks passed from `App`** — harden
  `TossedBall`'s rest detection against re-subscribing on every re-render.
- **Ruled-lines fallback paper texture** — the spec calls for faint ruled
  lines on snapshot failure; it currently renders plain off-white.
