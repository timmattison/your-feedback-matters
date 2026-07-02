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
