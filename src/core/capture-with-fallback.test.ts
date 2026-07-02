import { captureWithFallback } from './capture-with-fallback';

// A promise that never settles — stands in for the html-to-image `toPng` stall
// that can strand the feedback machine in the 'capturing' phase forever.
const never = new Promise<string>(() => {});

test('resolves to the snapshot url when the capture finishes in time', async () => {
  const result = await captureWithFallback(
    Promise.resolve('data:image/png'),
    50,
  );
  expect(result).toBe('data:image/png');
});

test('falls back to null when the capture rejects', async () => {
  const result = await captureWithFallback(
    Promise.reject(new Error('boom')),
    50,
  );
  expect(result).toBeNull();
});

test('falls back to null when the capture never settles, without hanging', async () => {
  // Guard resolves later than the timeout: if captureWithFallback honours its
  // timeout it wins the race with null; if it hangs, the guard wins and the
  // assertion fails (rather than the whole test timing out).
  const guard = new Promise<'pending'>((resolve) =>
    setTimeout(() => resolve('pending'), 200),
  );
  const result = await Promise.race([captureWithFallback(never, 20), guard]);
  expect(result).toBeNull();
});
