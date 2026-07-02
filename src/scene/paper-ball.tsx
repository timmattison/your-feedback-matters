import { useEffect, useMemo, useRef, useState } from 'react';
import { useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import { planToss } from '../core/toss';
import { boundingRadius } from '../core/bounding-radius';
import { isBallInBasket } from '../core/basket-containment';
import {
  BASKET_RADIUS,
  JOLT_SIDE,
  JOLT_SPIN,
  JOLT_UP,
  PILE_IN_RADIUS,
  REST_SPEED_THRESHOLD,
  SETTLE_TIMEOUT_MS,
} from '../core/constants';

export interface PaperBallProps {
  geometry: THREE.BufferGeometry; // the crumpled mesh, cloned per ball
  snapshotUrl: string | null;
  startPosition: [number, number, number];
  ballRadius: number;
  seed: number;
  basketMouth: { x: number; y: number; z: number };
  basketBase: [number, number, number];
  /** The freshly-tossed ball; only it reports its rest to the state machine. */
  isActive: boolean;
  /** Bumped each time the basket slides — a change kicks a resting ball. */
  joltNonce: number;
  onRested(): void; // once, when the active ball first calms or times out
  onFellOut(): void; // once, after a ball outside the basket has faded away
}

/**
 * One crumpled paper: it arcs into the basket under physics, then either settles
 * into the pile (a made shot — it stays forever and later tosses land on it) or,
 * if it comes to rest outside the mouth, fades out and asks to be removed. A
 * resting ball also reacts to `joltNonce` (bumped when the basket slides) with a
 * random kick, so the pile jostles and the odd paper hops the rim — at which
 * point the same out-of-basket test culls it.
 */
export function PaperBall({
  geometry,
  snapshotUrl,
  startPosition,
  ballRadius,
  seed,
  basketMouth,
  basketBase,
  isActive,
  joltNonce,
  onRested,
  onFellOut,
}: PaperBallProps) {
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

  // Size the collider to the mesh's true reach so seeded lumps rest against the
  // wall instead of poking through it (max() guards a degenerate geometry).
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

  // Latest transform + mutable flags, read inside the physics subscriptions so
  // the subscriptions can be set up once and never churn on re-render.
  const positionRef = useRef<[number, number, number]>(startPosition);
  const restingRef = useRef(false);
  const leavingRef = useRef(false);
  const reportedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const basketBaseRef = useRef(basketBase);
  basketBaseRef.current = basketBase;
  const onRestedRef = useRef(onRested);
  onRestedRef.current = onRested;
  const onFellOutRef = useRef(onFellOut);
  onFellOutRef.current = onFellOut;

  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const unsubPos = api.position.subscribe((p) => {
      positionRef.current = [p[0], p[1], p[2]];
    });
    let calmFrames = 0;
    const startedAt = performance.now();
    const unsubVel = api.velocity.subscribe(([vx, vy, vz]) => {
      const speed = Math.hypot(vx, vy, vz);
      calmFrames = speed < REST_SPEED_THRESHOLD ? calmFrames + 1 : 0;
      const settled = calmFrames > 30;
      const timedOut = performance.now() - startedAt > SETTLE_TIMEOUT_MS;
      restingRef.current = settled;
      if (!settled && !timedOut) return;
      // The active toss tells the machine it has come to rest, exactly once.
      if (isActiveRef.current && !reportedRef.current) {
        reportedRef.current = true;
        onRestedRef.current();
      }
      // A ball at rest outside the mouth has fallen out — fade and remove it.
      if (
        !leavingRef.current &&
        !isBallInBasket(positionRef.current, {
          base: basketBaseRef.current,
          radius: PILE_IN_RADIUS,
        })
      ) {
        leavingRef.current = true;
        setLeaving(true);
      }
    });
    return () => {
      unsubPos();
      unsubVel();
    };
  }, [api.position, api.velocity]);

  // Kick on each slide. Skip the initial mount, and only jostle a ball that is
  // actually resting in the pile (not mid-flight, not already leaving).
  const firstJolt = useRef(true);
  useEffect(() => {
    if (firstJolt.current) {
      firstJolt.current = false;
      return;
    }
    if (leavingRef.current || !restingRef.current) return;
    api.velocity.set(
      (Math.random() - 0.5) * 2 * JOLT_SIDE,
      JOLT_UP * (0.4 + 0.6 * Math.random()),
      (Math.random() - 0.5) * 2 * JOLT_SIDE,
    );
    api.angularVelocity.set(
      (Math.random() - 0.5) * JOLT_SPIN,
      (Math.random() - 0.5) * JOLT_SPIN,
      (Math.random() - 0.5) * JOLT_SPIN,
    );
  }, [joltNonce, api.velocity, api.angularVelocity]);

  const texture = useMemo(() => {
    if (snapshotUrl === null) return null;
    const tex = new THREE.TextureLoader().load(snapshotUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [snapshotUrl]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        color: texture === null ? '#fdfdf8' : 'white',
        side: THREE.DoubleSide,
        roughness: 0.9,
        transparent: true,
      }),
    [texture],
  );

  // R3F only auto-disposes objects it created from JSX; the geometry (a clone),
  // texture, and material are all created imperatively, so free their GPU memory
  // ourselves when this ball unmounts (mirrors the rest of the scene).
  useEffect(() => () => texture?.dispose(), [texture]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Fade a fallen-out ball, then ask the pile to drop it.
  useEffect(() => {
    if (!leaving) return;
    let raf = 0;
    const step = () => {
      material.opacity = Math.max(0, material.opacity - 0.03);
      if (material.opacity > 0) {
        raf = requestAnimationFrame(step);
      } else {
        onFellOutRef.current();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [leaving, material]);

  return <mesh ref={ref} geometry={geometry} material={material} />;
}
