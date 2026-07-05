export const CAMERA_FOV_DEG = 50;
export const CAMERA_DISTANCE = 10;
export const CRUMPLE_DURATION_S = 1.1;
export const MESH_SEGMENTS = 64;

// Fishing a piled wad back out to inspect it. INSPECT_CRUMPLE_T is the crumple
// parameter the note un-crumples *to* — ~75% flat (t = 0.25), left heavily
// creased so it reads as a once-crumpled piece of paper smoothed back out rather
// than a pristine sheet. The residual crease is (1 - INSPECT_CRUMPLE_T): raise it
// for more wrinkle (the snapshot text keeps getting less legible), drop it toward
// 0.05 for a flatter, cleaner note. INSPECT_DURATION_S is how long the un-crumple
// fly-up (and the mirrored re-crumple on dismiss) takes.
export const INSPECT_CRUMPLE_T = 0.25;
export const INSPECT_DURATION_S = 0.9;

// Draw order for the inspect lightbox. The scrim (a translucent dark quad) is
// drawn after the basket/pile but BEFORE the pulled note, and the note is drawn
// last — both with depth-testing off — so the scrim dims everything behind it
// while the note on top stays bright. Higher renderOrder draws later; both are
// above the default-0 pile so they paint over it.
export const SCRIM_RENDER_ORDER = 10;
export const INSPECTED_NOTE_RENDER_ORDER = 20;
// Lightbox dim. The pulled note draws in front of this at full brightness, so
// the scrim has to be dark enough that the note (a snapshot of the same form,
// landing on the form's own spot) reads as a distinct, lit-up peek rather than
// blending into the form showing through behind it.
export const SCRIM_OPACITY = 0.82;

// A resting wad projects to only a few dozen pixels and sits low in the basket,
// partly behind the rim — too small to click reliably if the hit disk is exactly
// the wad's radius. Pad the pick target so clicking anywhere on the visible wad
// registers: scale the projected radius and enforce a pixel floor. Picking stays
// unambiguous — the basket holds nothing but wads, and overlaps resolve to the
// front-most wad (see pickBallAt).
export const PICK_RADIUS_SCALE = 1.8;
export const PICK_MIN_RADIUS_PX = 48;
export const GRAVITY_Y = -9.81;
// The basket is a tapered round bin: BASKET_RADIUS is the mouth (the design
// width, unchanged), and the wall narrows to BASKET_BOTTOM_RADIUS at the floor.
// BASKET_HEIGHT makes it taller than it is wide, so it reads as a normal
// wastebasket rather than a short, fat cone.
export const BASKET_RADIUS = 1.1;
export const BASKET_BOTTOM_RADIUS = 0.9;
export const BASKET_HEIGHT = 2.5;
export const SETTLE_TIMEOUT_MS = 3500;
// How long to wait for the form-to-PNG capture before giving up and tossing a
// blank-textured wad instead. The capture usually finishes in tens of ms; this
// only trips if `toPng` stalls (see captureWithFallback), so the machine can
// never wedge in its 'capturing' phase.
export const CAPTURE_TIMEOUT_MS = 3000;
export const REST_SPEED_THRESHOLD = 0.15;
export const MISS_PROBABILITY = 0.25;

// A resting paper counts as "in the basket" (and piles up) within this radius
// of the basket axis; beyond it the paper has fallen out and is removed.
// Slightly wider than the rim so a ball that settles right against the inner
// wall isn't culled.
export const PILE_IN_RADIUS = BASKET_RADIUS + 0.2;

// When the basket slides in/out, each resting paper gets a random kick so the
// pile jostles and the occasional one hops the rim and tumbles out. JOLT_UP is
// the peak upward speed (m/s), JOLT_SIDE the peak sideways speed, JOLT_SPIN the
// peak tumble. Tuned so most papers resettle and only a few go flying — but the
// kick has to actually launch a heavier, higher-damped wad, so it hits hard.
export const JOLT_UP = 5;
export const JOLT_SIDE = 3.4;
export const JOLT_SPIN = 11;

// Paper-ball rigid body. A crumpled wad is small, dense, and dead — it should
// thud into the pile and stop, not roll and balance like a marble. So the body
// is heavier than a toy sphere (BALL_MASS), sheds linear and (especially)
// angular speed fast (BALL_*_DAMPING kills the endless rolling), and is allowed
// to fall asleep once it is barely moving (BALL_SLEEP_*), which freezes the
// micro-jitter that keeps a pile of spheres subtly creeping. The sleep speed
// sits just above REST_SPEED_THRESHOLD so a ball reports "at rest" before it
// nods off, and the sleep delay is long enough that the active toss always
// reports its rest to the state machine first.
export const BALL_MASS = 0.18;
export const BALL_LINEAR_DAMPING = 0.4;
export const BALL_ANGULAR_DAMPING = 0.75;
export const BALL_SLEEP_SPEED_LIMIT = 0.18;
export const BALL_SLEEP_TIME_LIMIT = 0.8;

// Contact behavior for the whole world: grippy (papers don't slide off each
// other and roll away) and nearly dead (a wad barely bounces off the floor or
// the pile). Applied as the default contact material on the physics world.
export const PILE_FRICTION = 0.55;
export const PILE_RESTITUTION = 0.08;

// Basket slide durations, in milliseconds. These MUST match the transition
// timings in scene.css (`.scene-overlay` slide-in, `.scene-overlay--hidden`
// slide-out) — the jolt scheduler (`core/jolt.ts`) holds the slide-in kick
// until the basket has finished arriving on-screen, so it can only line up with
// the animation if the two agree.
export const SLIDE_IN_MS = 700;
export const SLIDE_OUT_MS = 500;

// The slide-in easing (easeOutExpo in scene.css) covers ~99% of the distance in
// the first ~60% of SLIDE_IN_MS, then inches through a long tail. The basket
// therefore *looks* parked well before the transition nominally ends, so the
// pile's slide-in jolt is timed to this fraction of the slide — its visual stop
// — instead of the nominal end, which would drop the kick into the dead pause
// after the basket has already settled.
export const SLIDE_IN_SETTLE_FRACTION = 0.5;
