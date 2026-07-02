import {
  worldPointToScreen,
  type CameraSpec,
  type ScreenPoint,
  type Viewport,
} from './screen-to-world';

// A resting wad projected into screen space, ready to hit-test against a click.
export interface ScreenBall {
  id: number;
  cx: number; // disk center x, screen px
  cy: number; // disk center y, screen px
  r: number; // disk radius, screen px
  depth: number; // world z of the wad — LARGER = nearer the camera = front-most
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// STUB (red): compiles and references worldPointToScreen so tsc/lint resolve,
// but returns a behaviorally-wrong empty rect.
export function basketScreenRect(
  base: readonly [number, number, number],
  mouthHeight: number,
  radius: number,
  viewport: Viewport,
  cam: CameraSpec,
): ScreenRect {
  void worldPointToScreen;
  void base;
  void mouthHeight;
  void radius;
  void viewport;
  void cam;
  return { left: 0, top: 0, width: 0, height: 0 };
}

// STUB (red): always reports no wad under the point.
export function pickBallAt(
  clickPx: ScreenPoint,
  balls: readonly ScreenBall[],
): number | null {
  void clickPx;
  void balls;
  return null;
}
