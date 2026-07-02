export const CAMERA_FOV_DEG = 50;
export const CAMERA_DISTANCE = 10;
export const CRUMPLE_DURATION_S = 1.1;
export const MESH_SEGMENTS = 64;
export const GRAVITY_Y = -9.81;
// The basket is a tapered round bin: BASKET_RADIUS is the mouth (the design
// width, unchanged), and the wall narrows to BASKET_BOTTOM_RADIUS at the floor.
// BASKET_HEIGHT makes it taller than it is wide, so it reads as a normal
// wastebasket rather than a short, fat cone.
export const BASKET_RADIUS = 1.1;
export const BASKET_BOTTOM_RADIUS = 0.9;
export const BASKET_HEIGHT = 2.5;
export const SETTLE_TIMEOUT_MS = 3500;
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
// peak tumble. Tuned so most papers resettle and only a few go flying.
export const JOLT_UP = 3.2;
export const JOLT_SIDE = 2.2;
export const JOLT_SPIN = 8;

// Basket slide durations, in milliseconds. These MUST match the transition
// timings in scene.css (`.scene-overlay` slide-in, `.scene-overlay--hidden`
// slide-out) — the jolt scheduler (`core/jolt.ts`) holds the slide-in kick
// until the basket has finished arriving on-screen, so it can only line up with
// the animation if the two agree.
export const SLIDE_IN_MS = 700;
export const SLIDE_OUT_MS = 500;
