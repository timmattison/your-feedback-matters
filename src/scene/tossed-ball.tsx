import { useEffect, useMemo, useRef } from 'react';
import { useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import { planToss } from '../core/toss';
import { boundingRadius } from '../core/bounding-radius';
import {
  BASKET_RADIUS,
  REST_SPEED_THRESHOLD,
  SETTLE_TIMEOUT_MS,
} from '../core/constants';

export interface TossedBallProps {
  geometry: THREE.BufferGeometry; // the crumpled mesh, cloned
  snapshotUrl: string | null;
  startPosition: [number, number, number];
  ballRadius: number;
  seed: number;
  basketMouth: { x: number; y: number; z: number };
  fading: boolean; // true during 'settling'
  onRested(): void; // once, when calm or timed out
}

export function TossedBall({
  geometry,
  snapshotUrl,
  startPosition,
  ballRadius,
  seed,
  basketMouth,
  fading,
  onRested,
}: TossedBallProps) {
  const plan = useMemo(
    () =>
      planToss(
        seed,
        { x: startPosition[0], y: startPosition[1], z: startPosition[2] },
        basketMouth,
        BASKET_RADIUS,
      ),
    [seed, startPosition, basketMouth],
  );

  // The design ballRadius is where the *average* surface sits, but the seeded
  // lumps push some vertices ~20% farther out. Size the collider to the mesh's
  // true reach so those lumps rest against the basket wall instead of poking
  // through it. (max() guards against a degenerate empty geometry.)
  const colliderRadius = useMemo(
    () => Math.max(ballRadius, boundingRadius(geometry)),
    [ballRadius, geometry],
  );

  const [ref, api] = useSphere(() => ({
    mass: 0.05,
    args: [colliderRadius],
    position: startPosition,
    velocity: plan.velocity,
    angularVelocity: plan.angularVelocity,
    linearDamping: 0.1,
    angularDamping: 0.1,
  }));

  const restedRef = useRef(false);
  useEffect(() => {
    let calmFrames = 0;
    const startedAt = performance.now();
    const unsubscribe = api.velocity.subscribe(([vx, vy, vz]) => {
      if (restedRef.current) return;
      const speed = Math.hypot(vx, vy, vz);
      calmFrames = speed < REST_SPEED_THRESHOLD ? calmFrames + 1 : 0;
      const timedOut = performance.now() - startedAt > SETTLE_TIMEOUT_MS;
      if (calmFrames > 30 || timedOut) {
        restedRef.current = true;
        onRested();
      }
    });
    return unsubscribe;
  }, [api.velocity, onRested]);

  const texture = useMemo(() => {
    if (snapshotUrl === null) return null;
    const tex = new THREE.TextureLoader().load(snapshotUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [snapshotUrl]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: texture === null ? '#fdfdf8' : 'white',
      side: THREE.DoubleSide,
      roughness: 0.9,
      transparent: true,
    });
  }, [texture]);

  // R3F only auto-disposes objects it created from JSX; this texture and
  // material are created imperatively, so free their GPU memory ourselves
  // on unmount/change (mirrors crumpling-paper.tsx's pattern).
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    if (fading) material.opacity = 0.999; // kick transparency; fade below
  }, [fading, material]);

  // gentle fade while settling
  useEffect(() => {
    if (!fading) return;
    let raf = 0;
    const step = () => {
      material.opacity = Math.max(0, material.opacity - 0.03);
      if (material.opacity > 0) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fading, material]);

  return <mesh ref={ref} geometry={geometry} material={material} />;
}
