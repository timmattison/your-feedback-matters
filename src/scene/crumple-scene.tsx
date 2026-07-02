import { useEffect, useMemo, useState } from 'react';
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
import { TossedBall } from './tossed-ball';
import { Wastebasket } from './wastebasket';
import { Ground } from './ground';

export interface CrumpleSceneProps {
  phase: Phase;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
}

const CAMERA = { fovDeg: CAMERA_FOV_DEG, distance: CAMERA_DISTANCE };

function SceneContents(props: CrumpleSceneProps) {
  const { size } = useThree();
  const viewport = { width: size.width, height: size.height };
  const worldH = visibleWorldHeight(CAMERA);
  const worldW = worldH * (size.width / size.height);

  // basket sits bottom-right, mouth opening upward
  const basketBase: [number, number, number] = [
    worldW / 2 - BASKET_RADIUS * 2.2,
    -worldH / 2 + 0.15,
    0,
  ];
  const basketMouth = {
    x: basketBase[0],
    y: basketBase[1] + BASKET_HEIGHT,
    z: basketBase[2],
  };

  const worldRect = useMemo(
    () =>
      props.formRect === null
        ? null
        : domRectToWorld(props.formRect, viewport, CAMERA),
    [props.formRect, viewport.width, viewport.height],
  );

  const field = useMemo(
    () =>
      worldRect === null
        ? null
        : createCrumpleField(props.tossSeed, worldRect.width, worldRect.height),
    [props.tossSeed, worldRect],
  );

  const [crumpledGeometry, setCrumpledGeometry] =
    useState<THREE.BufferGeometry | null>(null);

  // crumpledGeometry is a clone() handed off each round (see
  // crumpling-paper.tsx); it's created imperatively rather than via JSX, so
  // R3F won't auto-dispose it. Free the previous round's GPU buffers when a
  // new one arrives or this scene unmounts, mirroring the texture-disposal
  // pattern used elsewhere in this codebase.
  useEffect(() => {
    return () => {
      crumpledGeometry?.dispose();
    };
  }, [crumpledGeometry]);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />
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
                setCrumpledGeometry(geometry);
                props.onCrumpleFinished();
              }}
            />
          )}
        {(props.phase === 'tossing' || props.phase === 'settling') &&
          crumpledGeometry !== null &&
          field !== null &&
          worldRect !== null && (
            <TossedBall
              geometry={crumpledGeometry}
              snapshotUrl={props.snapshotUrl}
              startPosition={worldRect.center}
              ballRadius={field.ballRadius}
              seed={props.tossSeed}
              basketMouth={basketMouth}
              fading={props.phase === 'settling'}
              onRested={props.onBallRested}
            />
          )}
      </Physics>
    </>
  );
}

export function CrumpleScene(props: CrumpleSceneProps) {
  return (
    <div className="scene-overlay">
      <Canvas
        gl={{ alpha: true }}
        camera={{ fov: CAMERA_FOV_DEG, position: [0, 0, CAMERA_DISTANCE] }}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
