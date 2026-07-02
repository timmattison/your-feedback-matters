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
- **Record the README demo GIF** — `README.md` currently omits the demo
  GIF because recording one requires a running dev server, which this
  worktree's agent policy disallows. Record `docs/crumple-toss.gif`
  manually (one make, one rim-out) and wire it into the README's
  screenshot/demo section.
