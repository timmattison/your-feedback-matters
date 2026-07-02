import { describe, expect, it } from 'vitest';
import {
  basketRadiusAtHeightFraction,
  basketWallSlant,
} from './basket-geometry';
import {
  BASKET_BOTTOM_RADIUS,
  BASKET_HEIGHT,
  BASKET_RADIUS,
} from './constants';

describe('basketRadiusAtHeightFraction', () => {
  it('keeps the full design width at the mouth', () => {
    // "same width" — the top of the basket must stay at BASKET_RADIUS.
    expect(basketRadiusAtHeightFraction(1)).toBeCloseTo(BASKET_RADIUS, 6);
  });

  it('narrows to the bottom radius at the floor', () => {
    expect(basketRadiusAtHeightFraction(0)).toBeCloseTo(
      BASKET_BOTTOM_RADIUS,
      6,
    );
  });

  it('is narrower at the floor than at the mouth (it tapers inward)', () => {
    expect(basketRadiusAtHeightFraction(0)).toBeLessThan(
      basketRadiusAtHeightFraction(1),
    );
  });

  it('widens monotonically from floor to mouth', () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(
      basketRadiusAtHeightFraction,
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('tapers linearly, so the half-height radius is the average of the ends', () => {
    expect(basketRadiusAtHeightFraction(0.5)).toBeCloseTo(
      (BASKET_RADIUS + BASKET_BOTTOM_RADIUS) / 2,
      6,
    );
  });
});

describe('basketWallSlant', () => {
  it('is longer than the vertical height because the wall leans outward', () => {
    expect(basketWallSlant().length).toBeGreaterThan(BASKET_HEIGHT);
  });

  it('matches the hypotenuse of the taper run and the height', () => {
    const run = BASKET_RADIUS - BASKET_BOTTOM_RADIUS;
    expect(basketWallSlant().length).toBeCloseTo(
      Math.hypot(run, BASKET_HEIGHT),
      6,
    );
  });

  it('leans outward by the taper angle', () => {
    const run = BASKET_RADIUS - BASKET_BOTTOM_RADIUS;
    const { tilt } = basketWallSlant();
    expect(tilt).toBeGreaterThan(0);
    // rise = height, run = horizontal taper → tan(tilt) = run / height.
    expect(Math.tan(tilt)).toBeCloseTo(run / BASKET_HEIGHT, 6);
  });
});
