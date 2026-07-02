/**
 * Races a form-snapshot capture against a timeout so it can never wedge the
 * feedback machine.
 *
 * The 3D toss captures the form to a PNG (via html-to-image's `toPng`) for the
 * crumpled-paper texture. That capture normally resolves to a data URL or
 * rejects — but it can also *never settle* (observed in headless Chromium, where
 * `toPng` waits on an `img.decode()`/`requestAnimationFrame` that never fires).
 * Left unguarded, the machine sits in its 'capturing' phase forever and the form
 * freezes. This wraps the capture so:
 *
 *  - it resolves to the snapshot URL if the capture finishes within `timeoutMs`;
 *  - it resolves to `null` (a blank-textured wad — the toss still proceeds) if
 *    the capture rejects; and
 *  - it resolves to `null` if the capture has not settled by `timeoutMs`,
 *    so the machine always advances.
 *
 * The returned promise never rejects — callers get `string | null` and treat
 * `null` as "no texture, carry on".
 *
 * @param capture   the in-flight capture (e.g. `toPng(node)`)
 * @param timeoutMs how long to wait before giving up and falling back to `null`
 */
export function captureWithFallback(
  capture: Promise<string>,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    capture.then(
      (url) => finish(url),
      () => finish(null),
    );
  });
}
