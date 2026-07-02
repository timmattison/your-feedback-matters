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

// The clickable screen rect over the basket — where the DOM hit-layer is positioned.
// Encloses the basket interior: from the floor (base) up to the mouth, and ± the mouth
// radius wide, projected to pixels via worldPointToScreen. width/height come out positive
// because increasing world-x → increasing screen-x and increasing world-y → decreasing
// screen-y, so projecting the top-left (mouth, left) and bottom-right (floor, right)
// world corners yields an axis-aligned rect with positive extent.
export function basketScreenRect(
  base: readonly [number, number, number], // basket floor center, world [x,y,z]
  mouthHeight: number, // height of the mouth above the base (world units; BASKET_HEIGHT)
  radius: number, // mouth radius (world units; BASKET_RADIUS)
  viewport: Viewport,
  cam: CameraSpec,
): ScreenRect {
  const topLeft = worldPointToScreen(
    [base[0] - radius, base[1] + mouthHeight, base[2]],
    viewport,
    cam,
  );
  const bottomRight = worldPointToScreen(
    [base[0] + radius, base[1], base[2]],
    viewport,
    cam,
  );
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

// The clickable region for the DOM hit-layer: `basketRect` widened to cover every
// pickable wad's padded disk. `basketScreenRect` only spans the basket interior (floor
// up to the mouth), but a tall pile after many tosses can come to rest ABOVE the mouth —
// those top-of-pile wads project above the mouth rect and would fall outside the clickable
// box even though `pickBallAt` matches them. This returns the axis-aligned union of
// `basketRect` and each ball's disk bounding box [cx - r, cy - r] .. [cx + r, cy + r], so
// the region always covers every wad. With no balls it returns `basketRect` unchanged, and
// the result never shrinks below `basketRect`. The wads are basket-constrained, so the
// union stays down in the bottom-right corner, clear of the centred feedback form.
export function hitLayerRect(
  basketRect: ScreenRect,
  balls: readonly ScreenBall[],
): ScreenRect {
  let left = basketRect.left;
  let top = basketRect.top;
  let right = basketRect.left + basketRect.width;
  let bottom = basketRect.top + basketRect.height;
  for (const ball of balls) {
    left = Math.min(left, ball.cx - ball.r);
    top = Math.min(top, ball.cy - ball.r);
    right = Math.max(right, ball.cx + ball.r);
    bottom = Math.max(bottom, ball.cy + ball.r);
  }
  return { left, top, width: right - left, height: bottom - top };
}

// Which wad (if any) is under a screen-space click. The spec calls this "the front-most
// resting wad under the point": among the projected disks that contain the click, the wad
// nearest the camera (largest world z = `depth`) occludes and wins — that is the primary
// discriminator, exactly as the acceptance criterion "the front-most wad on overlap"
// requires. Ties on depth are broken by the disk whose center is nearest the click, then by
// smallest id, so the result is deterministic and independent of array order. Returns null
// if no wad's disk contains the point. Does not mutate the input array.
export function pickBallAt(
  clickPx: ScreenPoint,
  balls: readonly ScreenBall[],
): number | null {
  let best: { ball: ScreenBall; dist: number } | null = null;
  for (const ball of balls) {
    const dist = Math.hypot(clickPx.x - ball.cx, clickPx.y - ball.cy);
    if (dist > ball.r) {
      continue; // click is outside this disk
    }
    if (best === null || wins(ball, dist, best.ball, best.dist)) {
      best = { ball, dist };
    }
  }
  return best === null ? null : best.ball.id;
}

// True when `candidate` should occlude the current `incumbent`: nearer the camera wins;
// on equal depth the nearer disk center wins; on an exact tie the smaller id wins.
function wins(
  candidate: ScreenBall,
  candidateDist: number,
  incumbent: ScreenBall,
  incumbentDist: number,
): boolean {
  if (candidate.depth !== incumbent.depth) {
    return candidate.depth > incumbent.depth;
  }
  if (candidateDist !== incumbentDist) {
    return candidateDist < incumbentDist;
  }
  return candidate.id < incumbent.id;
}
