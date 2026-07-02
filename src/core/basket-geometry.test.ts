import { describe, expect, it } from 'vitest';
import {
  basketRadiusAtHeightFraction,
  basketWallElement,
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

describe('basketWallElement', () => {
  it('spans the whole wall when it runs floor to mouth', () => {
    const full = basketWallElement(0, 1);
    expect(full.centerHeight).toBeCloseTo(BASKET_HEIGHT / 2, 6);
    expect(full.length).toBeCloseTo(basketWallSlant().length, 6);
  });

  it('is shorter when it starts above the floor (the fix for ribs poking through)', () => {
    // A rib that begins at the foot ring instead of the floor must be shorter
    // than the full-height physics wall, so it stops at the ring.
    const lifted = basketWallElement(0.05, 1);
    expect(lifted.length).toBeLessThan(basketWallSlant().length);
  });

  it('takes a length proportional to the fraction of height it covers', () => {
    const half = basketWallElement(0, 0.5);
    expect(half.length).toBeCloseTo(basketWallSlant().length / 2, 6);
    const upperHalf = basketWallElement(0.5, 1);
    expect(upperHalf.length).toBeCloseTo(basketWallSlant().length / 2, 6);
  });

  it('centres the element at the mid-height of its span', () => {
    expect(basketWallElement(0, 0.5).centerHeight).toBeCloseTo(
      BASKET_HEIGHT * 0.25,
      6,
    );
    expect(basketWallElement(0.6, 0.8).centerHeight).toBeCloseTo(
      BASKET_HEIGHT * 0.7,
      6,
    );
  });

  it('keeps a lifted element entirely above its start height', () => {
    // bottom endpoint = centre − half the vertical extent = f0 · height,
    // so a rib starting at f0 never dips below f0 of the height.
    const f0 = 0.04;
    const el = basketWallElement(f0, 1);
    const verticalExtent = (1 - f0) * BASKET_HEIGHT;
    const bottom = el.centerHeight - verticalExtent / 2;
    expect(bottom).toBeCloseTo(f0 * BASKET_HEIGHT, 6);
    expect(bottom).toBeGreaterThan(0);
  });
});
