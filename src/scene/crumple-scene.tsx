import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import * as THREE from 'three';
import './scene.css';
import type { Phase } from '../core/feedback-machine';
import { createCrumpleField } from '../core/crumple';
import { domRectToWorld, visibleWorldHeight } from '../core/screen-to-world';
import {
  BASKET_HEIGHT,
  BASKET_RADIUS,
  CAMERA_DISTANCE,
  CAMERA_FOV_DEG,
  GRAVITY_Y,
} from '../core/constants';
import { CrumplingPaper } from './crumpling-paper';
import { PaperBall } from './paper-ball';
import { Wastebasket } from './wastebasket';
import { Ground } from './ground';

export interface CrumpleSceneProps {
  phase: Phase;
  /**
   * Whether the basket should be on-screen. False on the closed landing, which
   * slides the whole scene overlay off to the right; true once the form opens,
   * sliding it back in. The scene stays mounted either way so the transition
   * (see `.scene-overlay` in scene.css) can animate — and so the pile of tossed
   * paper survives the closed↔open cycle. Each flip also kicks the pile.
   */
  visible: boolean;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
}

const CAMERA = { fovDeg: CAMERA_FOV_DEG, distance: CAMERA_DISTANCE };

// A single crumpled paper living in the scene. Persists across tosses (made
// shots pile up) until it falls out of the basket and is removed.
interface PileEntry {
  id: number;
  geometry: THREE.BufferGeometry;
  snapshotUrl: string | null;
  startPosition: [number, number, number];
  ballRadius: number;
  seed: number;
}

function SceneContents(props: CrumpleSceneProps) {
  const { size } = useThree();
  const worldH = visibleWorldHeight(CAMERA);
  const worldW = worldH * (size.width / size.height);

  // basket sits bottom-right, mouth opening upward
  const basketBase = useMemo<[number, number, number]>(
    () => [worldW / 2 - BASKET_RADIUS * 2.2, -worldH / 2 + 0.15, 0],
    [worldW, worldH],
  );
  const basketMouth = useMemo(
    () => ({
      x: basketBase[0],
      y: basketBase[1] + BASKET_HEIGHT,
      z: basketBase[2],
    }),
    [basketBase],
  );

  const worldRect = useMemo(
    () =>
      props.formRect === null
        ? null
        : domRectToWorld(
            props.formRect,
            { width: size.width, height: size.height },
            CAMERA,
          ),
    [props.formRect, size.width, size.height],
  );

  const field = useMemo(
    () =>
      worldRect === null
        ? null
        : createCrumpleField(props.tossSeed, worldRect.width, worldRect.height),
    [props.tossSeed, worldRect],
  );

  // The pile: every crumpled ball ever tossed that hasn't fallen out. It lives
  // in state here (SceneContents never unmounts while in full3d), so paper
  // accumulates across the closed↔open cycle and new tosses land on the stack.
  const [pile, setPile] = useState<PileEntry[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const nextId = useRef(0);

  const removeBall = useCallback((id: number) => {
    setPile((current) => current.filter((entry) => entry.id !== id));
  }, []);

  // Bump a nonce whenever the basket slides (visible flips), which each resting
  // ball turns into a kick. Skip the initial mount — only actual slides jolt.
  const [joltNonce, setJoltNonce] = useState(0);
  const lastVisible = useRef(props.visible);
  useEffect(() => {
    if (lastVisible.current === props.visible) return;
    lastVisible.current = props.visible;
    setJoltNonce((n) => n + 1);
  }, [props.visible]);

  return (
    <>
      <ambientLight intensity={0.6} />
      {/* sky/ground gradient gives the round steel basket its shaded falloff */}
      <hemisphereLight args={['#ffffff', '#3a3f47', 0.6]} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />
      {/* soft fill from the opposite side so the shadowed wall isn't pure black */}
      <directionalLight position={[-5, 2, -3]} intensity={0.35} />
      <Physics gravity={[0, GRAVITY_Y, 0]}>
        <Ground y={-worldH / 2 + 0.1} />
        <Wastebasket base={basketBase} />
        {props.phase === 'crumpling' &&
          field !== null &&
          worldRect !== null && (
            <CrumplingPaper
              field={field}
              worldRect={worldRect}
              snapshotUrl={props.snapshotUrl}
              onCrumpleFinished={(geometry) => {
                const id = nextId.current++;
                setPile((current) => [
                  ...current,
                  {
                    id,
                    geometry,
                    snapshotUrl: props.snapshotUrl,
                    startPosition: worldRect.center,
                    ballRadius: field.ballRadius,
                    seed: props.tossSeed,
                  },
                ]);
                setActiveId(id);
                props.onCrumpleFinished();
              }}
            />
          )}
        {pile.map((entry) => (
          <PaperBall
            key={entry.id}
            geometry={entry.geometry}
            snapshotUrl={entry.snapshotUrl}
            startPosition={entry.startPosition}
            ballRadius={entry.ballRadius}
            seed={entry.seed}
            basketMouth={basketMouth}
            basketBase={basketBase}
            isActive={entry.id === activeId}
            joltNonce={joltNonce}
            onRested={props.onBallRested}
            onFellOut={() => removeBall(entry.id)}
          />
        ))}
      </Physics>
    </>
  );
}

export function CrumpleScene(props: CrumpleSceneProps) {
  return (
    <div
      className={`scene-overlay${props.visible ? '' : ' scene-overlay--hidden'}`}
    >
      <Canvas
        gl={{ alpha: true }}
        camera={{ fov: CAMERA_FOV_DEG, position: [0, 0, CAMERA_DISTANCE] }}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
