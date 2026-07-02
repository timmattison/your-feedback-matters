import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CrumpleField } from '../core/crumple';
import type { WorldRect } from '../core/screen-to-world';
import { CRUMPLE_DURATION_S, MESH_SEGMENTS } from '../core/constants';

export interface CrumplingPaperProps {
  field: CrumpleField;
  worldRect: WorldRect;
  snapshotUrl: string | null;
  onCrumpleFinished(): void;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function CrumplingPaper({
  field,
  worldRect,
  snapshotUrl,
  onCrumpleFinished,
}: CrumplingPaperProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const finished = useRef(false);

  const texture = useMemo(() => {
    if (snapshotUrl === null) return null;
    const tex = new THREE.TextureLoader().load(snapshotUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [snapshotUrl]);

  // R3F only auto-disposes objects it created from JSX; this texture is
  // created imperatively, so free its GPU memory ourselves on unmount/change.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (mesh === null || finished.current) return;
    progress.current = Math.min(
      1,
      progress.current + delta / CRUMPLE_DURATION_S,
    );
    const t = easeInOutCubic(progress.current);
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const [x, y, z] = field.sample(uvs.getX(i), uvs.getY(i), t);
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    if (progress.current >= 1) {
      finished.current = true;
      onCrumpleFinished();
    }
  });

  return (
    <mesh ref={meshRef} position={worldRect.center}>
      <planeGeometry
        args={[worldRect.width, worldRect.height, MESH_SEGMENTS, MESH_SEGMENTS]}
      />
      <meshStandardMaterial
        map={texture}
        color={texture === null ? '#fdfdf8' : 'white'}
        side={THREE.DoubleSide}
        roughness={0.9}
      />
    </mesh>
  );
}
