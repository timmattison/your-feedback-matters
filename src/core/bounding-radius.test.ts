import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boundingRadius } from './bounding-radius';
import { createCrumpleField } from './crumple';

function geometryFrom(points: number[][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  return geometry;
}

describe('boundingRadius', () => {
  it('returns the distance of the farthest vertex from the origin', () => {
    // farthest point is (3, 4, 0) → 5; it sits first so a naive
    // "return the last vertex" implementation would miss it.
    const geometry = geometryFrom([
      [3, 4, 0],
      [0, 0, 0],
      [1, 2, 2],
    ]);
    expect(boundingRadius(geometry)).toBeCloseTo(5, 6);
  });

  it('finds the farthest vertex regardless of its position in the buffer', () => {
    const geometry = geometryFrom([
      [1, 0, 0],
      [0, 0, 12], // farthest, in the middle
      [2, 2, 1],
    ]);
    expect(boundingRadius(geometry)).toBeCloseTo(12, 6);
  });

  it('encloses the lumpy crumpled ball beyond its nominal ballRadius', () => {
    // A real crumpled sheet: seeded ±jitter lumps push some vertices past the
    // design ballRadius, which is exactly why the collider must use this value.
    const field = createCrumpleField(1234, 4, 3);
    const segments = 48;
    const points: number[][] = [];
    for (let iy = 0; iy <= segments; iy++) {
      for (let ix = 0; ix <= segments; ix++) {
        points.push(field.sample(ix / segments, iy / segments, 1));
      }
    }
    const radius = boundingRadius(geometryFrom(points));
    expect(radius).toBeGreaterThan(field.ballRadius);
  });
});
