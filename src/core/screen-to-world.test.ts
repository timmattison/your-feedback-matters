import { domRectToWorld, visibleWorldHeight } from './screen-to-world';

const cam = { fovDeg: 50, distance: 10 };
const viewport = { width: 1000, height: 800 };

test('visible world height matches perspective FOV math', () => {
  // 2 * d * tan(fov/2)
  expect(visibleWorldHeight(cam)).toBeCloseTo(
    2 * 10 * Math.tan((50 * Math.PI) / 360),
    10,
  );
});

test('a rect centered in the viewport maps to the world origin', () => {
  const w = domRectToWorld(
    { left: 400, top: 300, width: 200, height: 200 },
    viewport,
    cam,
  );
  expect(w.center[0]).toBeCloseTo(0, 10);
  expect(w.center[1]).toBeCloseTo(0, 10);
  expect(w.center[2]).toBe(0);
});

test('a full-viewport-height rect spans the visible world height', () => {
  const w = domRectToWorld(
    { left: 0, top: 0, width: 100, height: 800 },
    viewport,
    cam,
  );
  expect(w.height).toBeCloseTo(visibleWorldHeight(cam), 10);
});

test('screen down/right maps to world down/right', () => {
  const w = domRectToWorld(
    { left: 900, top: 700, width: 100, height: 100 },
    viewport,
    cam,
  );
  expect(w.center[0]).toBeGreaterThan(0); // right of center
  expect(w.center[1]).toBeLessThan(0); // below center (world y up)
});
