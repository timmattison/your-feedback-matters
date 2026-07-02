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
  return 0;
}

export function domRectToWorld(
  rect: { left: number; top: number; width: number; height: number },
  viewport: Viewport,
  cam: CameraSpec,
): WorldRect {
  return { width: 0, height: 0, center: [0, 0, 0] };
}
