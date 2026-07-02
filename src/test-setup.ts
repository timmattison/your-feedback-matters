import '@testing-library/jest-dom/vitest';

// jsdom has no AnimationEvent constructor. React feature-detects
// `"AnimationEvent" in window` once, at module load, to pick which native
// event name to listen for. Without it, React falls back to probing
// jsdom's CSSStyleDeclaration for vendor-prefixed animation properties —
// and jsdom's `style` object reports `"WebkitAnimation" in style` as true
// even though it doesn't support vendor prefixes — so React ends up
// listening for "webkitAnimationEnd" instead of "animationend". That
// silently drops every onAnimationEnd handler in tests (fireEvent and
// manual dispatchEvent alike). This polyfill must run before react-dom is
// first imported, so it lives at the top of the global test setup file.
if (typeof window.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    readonly pseudoElement: string;
    constructor(type: string, eventInitDict: AnimationEventInit = {}) {
      super(type, eventInitDict);
      this.animationName = eventInitDict.animationName ?? '';
      this.elapsedTime = eventInitDict.elapsedTime ?? 0;
      this.pseudoElement = eventInitDict.pseudoElement ?? '';
    }
  }
  window.AnimationEvent =
    AnimationEventPolyfill as unknown as typeof AnimationEvent;
}
