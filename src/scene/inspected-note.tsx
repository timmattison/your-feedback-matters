import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCrumpleField, easeInOutCubic } from '../core/crumple';
import { closingT, openingT } from '../core/inspect-crumple';
import type { InspectPhase } from '../core/inspect-machine';
import {
  INSPECT_DURATION_S,
  INSPECTED_NOTE_RENDER_ORDER,
  MESH_SEGMENTS,
} from '../core/constants';

// The inspect interaction's animated note: a piled wad pulled out, un-crumpled to
// read, then (on dismiss) re-crumpled in place and handed back to the physics
// PaperBall to be thrown into the basket again.
//
// OPENING: rebuild the wad's exact crumple field from its seed/dims and replay it
// *backward* (via `openingT`), flying the group from the wad's resting pose up to
// the form's world center while slerping to identity (flat, facing the camera);
// fire `onOpenDone` at progress ≥ 1, then hold flat at the form spot.
// CLOSING: replay the field *forward* again (via `closingT`) to re-wad the sheet
// in place at the form spot, tumbling the orientation toward a throw; fire
// `onCloseDone` at progress ≥ 1, at which point the scene swaps this note back
// for a PaperBall that tosses it into the basket.

export interface InspectedNoteProps {
  entry: {
    width: number;
    height: number;
    snapshotUrl: string | null;
    seed: number;
    startPosition: [number, number, number]; // form's world center — the fly-up target
    restPosition: [number, number, number] | null; // where the wad settled
    restQuaternion: [number, number, number, number] | null; // its resting orientation
  };
  /** This note's inspect phase; it is only mounted while a note is pulled. */
  phase: Exclude<InspectPhase, 'browsing'>;
  /** Fires once when the open (fish-up) animation completes (progress ≥ 1). */
  onOpenDone(): void;
  /** Fires once when the close (re-crumple) animation completes (progress ≥ 1). */
  onCloseDone(): void;
}

export function InspectedNote({
  entry,
  phase,
  onOpenDone,
  onCloseDone,
}: InspectedNoteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const openProgress = useRef(0);
  const openDone = useRef(false);
  const closeProgress = useRef(0);
  const closeDone = useRef(false);

  // Rebuild *this wad's* exact field — same seed and dims it was crumpled with —
  // so the un-crumple is the provable reverse of how it wadded up (and the
  // re-crumple on dismiss retraces that same wadding forward).
  const field = useMemo(
    () => createCrumpleField(entry.seed, entry.width, entry.height),
    [entry.seed, entry.width, entry.height],
  );

  const texture = useMemo(() => {
    if (entry.snapshotUrl === null) return null;
    const tex = new THREE.TextureLoader().load(entry.snapshotUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [entry.snapshotUrl]);

  // R3F only auto-disposes objects it created from JSX; this texture is created
  // imperatively, so free its GPU memory ourselves on unmount/change. (The
  // geometry and material below are JSX, so R3F disposes those for us.)
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  // Fly endpoints + the closing tumble. Guard the nullable rest fields by falling
  // back to the form spot / identity — in practice a note is only inspected after
  // it has a resting pose, but be defensive so a null pose can't NaN the animation.
  const { from, to, fromQuat, toQuat, tumbleQuat } = useMemo(() => {
    return {
      from: new THREE.Vector3(...(entry.restPosition ?? entry.startPosition)),
      to: new THREE.Vector3(...entry.startPosition),
      fromQuat: new THREE.Quaternion(...(entry.restQuaternion ?? [0, 0, 0, 1])),
      toQuat: new THREE.Quaternion(), // identity → flat, facing the camera (+z)
      // A partial roll so the note visibly tumbles as it re-wads, blending into
      // the physics throw the PaperBall picks up once closing completes.
      tumbleQuat: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0.35, 1, 0.15).normalize(),
        Math.PI * 0.85,
      ),
    };
  }, [entry.restPosition, entry.startPosition, entry.restQuaternion]);

  // Morph the plane's vertices to crumple parameter `t` via the rebuilt field.
  const writeMorph = useCallback(
    (mesh: THREE.Mesh, t: number) => {
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position;
      const uvs = geometry.attributes.uv;
      for (let i = 0; i < positions.count; i++) {
        const [x, y, z] = field.sample(uvs.getX(i), uvs.getY(i), t);
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    },
    [field],
  );

  // Seed the first frame at progress 0 so the note appears AS the resting wad —
  // no flat-plane flash before the first useFrame runs.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (mesh === null || group === null) return;
    writeMorph(mesh, openingT(0));
    group.position.copy(from);
    group.quaternion.copy(fromQuat);
  }, [writeMorph, from, fromQuat]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (mesh === null || group === null) return;

    // CLOSING: re-crumple in place at the form spot, tumbling toward a throw.
    if (phase === 'closing') {
      closeProgress.current = Math.min(
        1,
        closeProgress.current + delta / INSPECT_DURATION_S,
      );
      writeMorph(mesh, closingT(closeProgress.current));
      const k = easeInOutCubic(closeProgress.current);
      group.position.copy(to);
      group.quaternion.slerpQuaternions(toQuat, tumbleQuat, k);
      if (closeProgress.current >= 1 && !closeDone.current) {
        closeDone.current = true;
        onCloseDone();
      }
      return;
    }

    // OPENING: fly up + un-crumple. Once done, hold flat at the form spot.
    if (openDone.current) return;
    openProgress.current = Math.min(
      1,
      openProgress.current + delta / INSPECT_DURATION_S,
    );
    writeMorph(mesh, openingT(openProgress.current));
    const k = easeInOutCubic(openProgress.current);
    group.position.lerpVectors(from, to, k);
    group.quaternion.slerpQuaternions(fromQuat, toQuat, k);
    if (openProgress.current >= 1 && !openDone.current) {
      openDone.current = true;
      onOpenDone();
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} renderOrder={INSPECTED_NOTE_RENDER_ORDER}>
        <planeGeometry
          args={[entry.width, entry.height, MESH_SEGMENTS, MESH_SEGMENTS]}
        />
        <meshStandardMaterial
          map={texture}
          color={texture === null ? '#fdfdf8' : 'white'}
          side={THREE.DoubleSide}
          roughness={0.9}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
