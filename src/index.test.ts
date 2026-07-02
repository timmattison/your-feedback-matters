import * as pkg from './index';

// crumple-scene pulls in three / @react-three/fiber / @react-three/cannon,
// which can't run (or, for cannon@6, even resolve) under jsdom — the whole
// suite mocks the scene and verifies it visually instead. Mocking here keeps
// this a pure check of the public entry's re-export plumbing: if index.ts stops
// re-exporting a name, `pkg.<name>` is undefined regardless of the mock.
vi.mock('./scene/crumple-scene', () => ({
  CrumpleScene: () => null,
}));

// The public entry is the package's whole API surface — guard that the pieces
// an advanced consumer might reach for stay exported from the package root.
test('re-exports the top-level widget', () => {
  expect(pkg.YourFeedbackMatters).toBeDefined();
});

test('re-exports the lower-level CrumpleScene and FeedbackForm for advanced consumers', () => {
  expect(pkg.CrumpleScene).toBeDefined();
  expect(pkg.FeedbackForm).toBeDefined();
});
