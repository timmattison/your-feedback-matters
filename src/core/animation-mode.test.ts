import { pickAnimationMode } from './animation-mode';

test('reduced motion wins over everything', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: true, webglAvailable: true }),
  ).toBe('instant');
});

test('no WebGL falls back to the CSS toss', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: false, webglAvailable: false }),
  ).toBe('css');
});

test('full experience when everything is available', () => {
  expect(
    pickAnimationMode({ prefersReducedMotion: false, webglAvailable: true }),
  ).toBe('full3d');
});
