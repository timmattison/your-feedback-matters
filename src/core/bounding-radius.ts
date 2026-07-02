import * as THREE from 'three';

/**
 * Radius of the smallest origin-centered sphere that encloses every vertex of
 * `geometry` — i.e. the farthest vertex's distance from the local origin.
 *
 * The tossed ball's cannon collider is a sphere centered on the rigid body's
 * origin, and the crumpled mesh is rendered as that body's child at local
 * (0, 0, 0). So the collider only fully contains the visible paper when its
 * radius is measured from the *origin*, not from the mesh's centroid or its
 * minimal bounding sphere. Sizing the collider with this value keeps the lumpy,
 * jittered paper from poking through the basket walls.
 */
export function boundingRadius(geometry: THREE.BufferGeometry): number {
  return 0;
}
