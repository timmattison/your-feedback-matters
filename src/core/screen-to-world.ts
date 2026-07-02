export interface Viewport {
  width: number;
  height: number;
}

export interface CameraSpec {
  fovDeg: number;
  distance: number;
}

export interface WorldRect {
  width: number;
  height: number;
  center: [number, number, number];
}

export function visibleWorldHeight(cam: CameraSpec): number {
  return 2 * cam.distance * Math.tan((cam.fovDeg * Math.PI) / 360);
}

export function domRectToWorld(
  rect: { left: number; top: number; width: number; height: number },
  viewport: Viewport,
  cam: CameraSpec,
): WorldRect {
  const worldPerPixel = visibleWorldHeight(cam) / viewport.height;
  const cxPx = rect.left + rect.width / 2;
  const cyPx = rect.top + rect.height / 2;
  return {
    width: rect.width * worldPerPixel,
    height: rect.height * worldPerPixel,
    center: [
      (cxPx - viewport.width / 2) * worldPerPixel,
      (viewport.height / 2 - cyPx) * worldPerPixel,
      0,
    ],
  };
}

export interface ScreenPoint {
  x: number;
  y: number;
}

// Inverse of domRectToWorld's center mapping: project a world point onto the screen
// (pixels). Uses the same z = 0 / orthographic-per-pixel assumption as domRectToWorld,
// so point[2] is ignored — wads rest near z = 0, where this is accurate.
export function worldPointToScreen(
  point: readonly [number, number, number],
  viewport: Viewport,
  cam: CameraSpec,
): ScreenPoint {
  const pixelsPerWorld = viewport.height / visibleWorldHeight(cam);
  return {
    x: point[0] * pixelsPerWorld + viewport.width / 2,
    y: viewport.height / 2 - point[1] * pixelsPerWorld,
  };
}

// Scale a world-space radius/length to its pixel size at the z = 0 plane. The exact
// inverse of the worldPerPixel scaling used by domRectToWorld.
export function worldRadiusToScreen(
  r: number,
  viewport: Viewport,
  cam: CameraSpec,
): number {
  const pixelsPerWorld = viewport.height / visibleWorldHeight(cam);
  return r * pixelsPerWorld;
}
