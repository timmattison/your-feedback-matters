import { useBox, useCylinder } from '@react-three/cannon';
import { BASKET_HEIGHT, BASKET_RADIUS } from '../core/constants';

const WALL_SEGMENTS = 12;

function WallSegment({
  base,
  index,
}: {
  base: [number, number, number];
  index: number;
}) {
  const angle = (index / WALL_SEGMENTS) * Math.PI * 2;
  const segmentWidth = (2 * Math.PI * BASKET_RADIUS) / WALL_SEGMENTS;
  useBox(() => ({
    type: 'Static',
    args: [segmentWidth * 1.1, BASKET_HEIGHT, 0.05],
    position: [
      base[0] + Math.cos(angle) * BASKET_RADIUS,
      base[1] + BASKET_HEIGHT / 2,
      base[2] + Math.sin(angle) * BASKET_RADIUS,
    ],
    rotation: [0, -angle + Math.PI / 2, 0],
  }));
  return null;
}

export function Wastebasket({ base }: { base: [number, number, number] }) {
  useCylinder(() => ({
    type: 'Static',
    args: [BASKET_RADIUS, BASKET_RADIUS, 0.05, 16],
    position: [base[0], base[1] + 0.05, base[2]],
  }));
  return (
    <>
      {Array.from({ length: WALL_SEGMENTS }, (_, i) => (
        <WallSegment key={i} base={base} index={i} />
      ))}
      <mesh position={[base[0], base[1] + BASKET_HEIGHT / 2, base[2]]}>
        <cylinderGeometry
          args={[
            BASKET_RADIUS,
            BASKET_RADIUS * 0.75,
            BASKET_HEIGHT,
            24,
            4,
            true,
          ]}
        />
        <meshStandardMaterial color="#4a4a4a" wireframe />
      </mesh>
    </>
  );
}
