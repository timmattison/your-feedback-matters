import { worldPointToScreen } from './screen-to-world';
import {
  basketScreenRect,
  pickBallAt,
  type ScreenBall,
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
  const balls = [
    ball(1, 95, 100, 30, 1),
    ball(2, 105, 100, 30, 5),
  ];
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
