import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCrumpleField, easeInOutCubic } from '../core/crumple';
import { openingT } from '../core/inspect-crumple';
import {
  INSPECT_DURATION_S,
  INSPECTED_NOTE_RENDER_ORDER,
  MESH_SEGMENTS,
} from '../core/constants';

// The "opening" (fish-up) half of the inspect interaction: a piled wad, pulled
// out and un-crumpled. This component rebuilds the wad's exact crumple field
// from its seed/dims and replays it *backward* (via `openingT`), flying the
// group from the wad's resting pose up to the form's world center while slerping
// to identity (flat, facing the camera). It fires `onOpenDone` once the morph
// completes, then holds the flat note at the form spot.
//
// SEAM: the mirrored "closing" (re-crumple in place + re-throw back into the
// basket) is Phase 4. It is intentionally NOT implemented here — when it lands
// it will replay `closingT` and hand the wad back to the physics `PaperBall`.

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
  /** Fires once when the open animation completes (progress ≥ 1). */
  onOpenDone(): void;
}

export function InspectedNote({ entry, onOpenDone }: InspectedNoteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const done = useRef(false);

  // Rebuild *this wad's* exact field — same seed and dims it was crumpled with —
  // so un-crumpling is the provable reverse of how it wadded up.
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

  // Fly endpoints. Guard the nullable rest fields by falling back to the form
  // spot / identity — in practice a note is only inspected after it has a
  // resting pose, but be defensive so a null pose can't NaN the animation.
  const { from, to, fromQuat, toQuat } = useMemo(() => {
    return {
      from: new THREE.Vector3(...(entry.restPosition ?? entry.startPosition)),
      to: new THREE.Vector3(...entry.startPosition),
      fromQuat: new THREE.Quaternion(...(entry.restQuaternion ?? [0, 0, 0, 1])),
      toQuat: new THREE.Quaternion(), // identity → flat, facing the camera (+z)
    };
  }, [entry.restPosition, entry.startPosition, entry.restQuaternion]);

  // Seed the first frame at progress 0 so the note appears AS the resting wad —
  // no flat-plane flash before the first useFrame runs.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (mesh === null || group === null) return;
    const t = openingT(0);
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const [x, y, z] = field.sample(uvs.getX(i), uvs.getY(i), t);
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    group.position.copy(from);
    group.quaternion.copy(fromQuat);
  }, [field, from, fromQuat]);

  useFrame((_, delta) => {
    if (meshRef.current === null || groupRef.current === null) return;
    progress.current = Math.min(
      1,
      progress.current + delta / INSPECT_DURATION_S,
    );
    const t = openingT(progress.current);
    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const [x, y, z] = field.sample(uvs.getX(i), uvs.getY(i), t);
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const k = easeInOutCubic(progress.current);
    groupRef.current.position.lerpVectors(from, to, k);
    groupRef.current.quaternion.slerpQuaternions(fromQuat, toQuat, k);

    if (progress.current >= 1 && !done.current) {
      done.current = true;
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
