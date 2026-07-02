/**
 * STUB (red step): forwards the capture without any timeout, so a capture that
 * never settles hangs forever. The real implementation adds the timeout fallback.
 */
export function captureWithFallback(
  capture: Promise<string>,
  _timeoutMs: number,
): Promise<string | null> {
  return capture.then(
    (url) => url,
    () => null,
  );
}
