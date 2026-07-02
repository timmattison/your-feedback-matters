import { worldPointToScreen } from './screen-to-world';
import {
  basketScreenRect,
  hitLayerRect,
  pickBallAt,
  type ScreenBall,
  type ScreenRect,
} from './pick-ball';

const cam = { fovDeg: 50, distance: 10 };
const viewport = { width: 1000, height: 800 };

function ball(
  id: number,
  cx: number,
  cy: number,
  r: number,
  depth: number,
): ScreenBall {
  return { id, cx, cy, r, depth };
}

test('pickBallAt returns null when the point is outside all wads', () => {
  const balls = [ball(1, 100, 100, 10, 0), ball(2, 500, 500, 20, 1)];
  expect(pickBallAt({ x: 300, y: 300 }, balls)).toBeNull();
});

test('pickBallAt returns null for an empty pile (all wads fallen out)', () => {
  expect(pickBallAt({ x: 400, y: 400 }, [])).toBeNull();
});

test('pickBallAt returns the wad id when the point is inside exactly one wad', () => {
  const balls = [ball(1, 100, 100, 10, 0), ball(2, 500, 500, 20, 1)];
  expect(pickBallAt({ x: 505, y: 495 }, balls)).toBe(2);
});

test('pickBallAt returns the front-most wad on overlap (front-most listed first)', () => {
  // Both disks contain (100, 100); id 2 has larger depth (nearer camera).
  const balls = [
    ball(2, 105, 100, 30, 5), // front-most, listed first
    ball(1, 95, 100, 30, 1),
  ];
  expect(pickBallAt({ x: 100, y: 100 }, balls)).toBe(2);
});

test('pickBallAt returns the front-most wad on overlap (front-most listed last)', () => {
  // Same overlap, but the front-most wad is listed last — order must not matter.
  const balls = [
    ball(1, 95, 100, 30, 1),
    ball(2, 105, 100, 30, 5), // front-most, listed last
  ];
  expect(pickBallAt({ x: 100, y: 100 }, balls)).toBe(2);
});

test('pickBallAt does not mutate the input array', () => {
  const balls = [ball(1, 95, 100, 30, 1), ball(2, 105, 100, 30, 5)];
  const snapshot = [...balls];
  pickBallAt({ x: 100, y: 100 }, balls);
  expect(balls).toEqual(snapshot);
});

test('basketScreenRect encloses a wad resting at the basket base', () => {
  const base: [number, number, number] = [3, -4, 0];
  const mouthHeight = 2.5;
  const radius = 1.1;
  const rect = basketScreenRect(base, mouthHeight, radius, viewport, cam);

  // Rect must have positive extent.
  expect(rect.width).toBeGreaterThan(0);
  expect(rect.height).toBeGreaterThan(0);

  // A wad resting slightly above the floor.
  const resting = worldPointToScreen(
    [base[0], base[1] + 0.35, base[2]],
    viewport,
    cam,
  );
  expect(resting.x).toBeGreaterThanOrEqual(rect.left);
  expect(resting.x).toBeLessThanOrEqual(rect.left + rect.width);
  expect(resting.y).toBeGreaterThanOrEqual(rect.top);
  expect(resting.y).toBeLessThanOrEqual(rect.top + rect.height);

  // A wad exactly on the floor (bottom edge of the rect).
  const onFloor = worldPointToScreen(base, viewport, cam);
  expect(onFloor.x).toBeGreaterThanOrEqual(rect.left);
  expect(onFloor.x).toBeLessThanOrEqual(rect.left + rect.width);
  expect(onFloor.y).toBeGreaterThanOrEqual(rect.top);
  expect(onFloor.y).toBeLessThanOrEqual(rect.top + rect.height);
});

// Basket screen rect used by the hitLayerRect tests: mouth at top, floor at bottom.
const basketRect: ScreenRect = { left: 700, top: 400, width: 200, height: 250 };

test('hitLayerRect returns the basket rect unchanged when there are no balls', () => {
  expect(hitLayerRect(basketRect, [])).toEqual(basketRect);
});

test('hitLayerRect always contains the basket rect entirely', () => {
  // A wad tucked well inside the basket must never shrink the region.
  const balls = [ball(1, 800, 500, 20, 0)];
  const rect = hitLayerRect(basketRect, balls);
  expect(rect.left).toBeLessThanOrEqual(basketRect.left);
  expect(rect.top).toBeLessThanOrEqual(basketRect.top);
  expect(rect.left + rect.width).toBeGreaterThanOrEqual(
    basketRect.left + basketRect.width,
  );
  expect(rect.top + rect.height).toBeGreaterThanOrEqual(
    basketRect.top + basketRect.height,
  );
});

test('hitLayerRect raises the top to cover a wad resting above the basket mouth', () => {
  // Regression for the finding: a tall pile rests above the mouth (small cy), so
  // cy - r sits above basketRect.top and the mouth-only rect would miss it.
  const balls = [ball(1, 800, 380, 30, 0)]; // cy - r = 350, above top (400)
  const rect = hitLayerRect(basketRect, balls);
  expect(rect.top).toBe(350);
  expect(rect.height).toBe(300); // bottom stays at 650, so 650 - 350
});

test('hitLayerRect grows the right edge for a wad extending past it', () => {
  const balls = [ball(1, 890, 500, 30, 0)]; // cx + r = 920, past right (900)
  const rect = hitLayerRect(basketRect, balls);
  expect(rect.left).toBe(700); // left edge unchanged
  expect(rect.left + rect.width).toBe(920);
});

test('hitLayerRect grows the left edge for a wad extending past it', () => {
  const balls = [ball(1, 710, 500, 30, 0)]; // cx - r = 680, past left (700)
  const rect = hitLayerRect(basketRect, balls);
  expect(rect.left).toBe(680);
  expect(rect.left + rect.width).toBe(900); // right edge unchanged
});

test('hitLayerRect grows the bottom edge for a wad extending past it', () => {
  const balls = [ball(1, 800, 640, 30, 0)]; // cy + r = 670, past bottom (650)
  const rect = hitLayerRect(basketRect, balls);
  expect(rect.top).toBe(400); // top edge unchanged
  expect(rect.top + rect.height).toBe(670);
});

test('hitLayerRect covers every wad when several extend in different directions', () => {
  const balls = [
    ball(1, 800, 350, 30, 0), // above the mouth: cy - r = 320
    ball(2, 890, 500, 40, 0), // past the right: cx + r = 930
    ball(3, 705, 600, 25, 0), // past the left: cx - r = 680
    ball(4, 780, 660, 20, 0), // past the bottom: cy + r = 680
  ];
  const rect = hitLayerRect(basketRect, balls);
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  for (const b of balls) {
    expect(rect.left).toBeLessThanOrEqual(b.cx - b.r);
    expect(rect.top).toBeLessThanOrEqual(b.cy - b.r);
    expect(right).toBeGreaterThanOrEqual(b.cx + b.r);
    expect(bottom).toBeGreaterThanOrEqual(b.cy + b.r);
  }
  // And it still contains the basket rect.
  expect(rect.left).toBeLessThanOrEqual(basketRect.left);
  expect(rect.top).toBeLessThanOrEqual(basketRect.top);
  expect(right).toBeGreaterThanOrEqual(basketRect.left + basketRect.width);
  expect(bottom).toBeGreaterThanOrEqual(basketRect.top + basketRect.height);
});
