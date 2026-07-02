import { useBox, useCylinder } from '@react-three/cannon';
import { BASKET_HEIGHT, BASKET_RADIUS } from '../core/constants';

// Physics: a sealed ring of thin static boxes standing in for the wall, plus a
// floor disk. The wall sits at BASKET_RADIUS and is perfectly straight so the
// visible basket (below) can line up with it exactly — a tapered look would let
// the ball rest against a wall the paper appears to hang outside of.
const WALL_SEGMENTS = 12;

// Visuals: a shaded steel wire-mesh bin — vertical ribs crossed by horizontal
// rings, capped with a rounded rim and standing on a footed base.
const VERTICAL_RIBS = 24;
const RING_HEIGHTS = [0.16, 0.44, 0.72]; // fractions of BASKET_HEIGHT
const RIB_RADIUS = 0.02;
const RING_TUBE = 0.022;
const RIM_TUBE = 0.05;
const FOOT_TUBE = 0.045;
const FLOOR_THICKNESS = 0.06;

// meshStandardMaterial has no environment map to reflect, so keep metalness low
// and lean on the scene's directional + hemisphere lights for the shaded, round
// look. A touch of metalness with lower roughness gives the rim its highlight.
const STEEL = { color: '#9aa1aa', metalness: 0.35, roughness: 0.46 } as const;
const STEEL_BRIGHT = {
  color: '#c4c9d0',
  metalness: 0.5,
  roughness: 0.28,
} as const;

const FLAT_RING: [number, number, number] = [Math.PI / 2, 0, 0];

/** One static box approximating a slice of the cylindrical wall. */
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

/** The shaded, solid wire-mesh basket the user actually sees. */
function BasketFrame({ base }: { base: [number, number, number] }) {
  return (
    <group position={base}>
      {/* solid floor so you can't see through the bottom */}
      <mesh position={[0, FLOOR_THICKNESS / 2 + 0.02, 0]}>
        <cylinderGeometry
          args={[
            BASKET_RADIUS * 0.95,
            BASKET_RADIUS * 0.86,
            FLOOR_THICKNESS,
            32,
          ]}
        />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      {/* vertical ribs */}
      {Array.from({ length: VERTICAL_RIBS }, (_, i) => {
        const angle = (i / VERTICAL_RIBS) * Math.PI * 2;
        return (
          <mesh
            key={`rib-${i}`}
            position={[
              Math.cos(angle) * BASKET_RADIUS,
              BASKET_HEIGHT / 2,
              Math.sin(angle) * BASKET_RADIUS,
            ]}
          >
            <cylinderGeometry
              args={[RIB_RADIUS, RIB_RADIUS, BASKET_HEIGHT, 8]}
            />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        );
      })}

      {/* horizontal rings weaving through the ribs */}
      {RING_HEIGHTS.map((h) => (
        <mesh
          key={`ring-${h}`}
          position={[0, h * BASKET_HEIGHT, 0]}
          rotation={FLAT_RING}
        >
          <torusGeometry args={[BASKET_RADIUS, RING_TUBE, 12, 48]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}

      {/* rounded rim at the mouth */}
      <mesh position={[0, BASKET_HEIGHT, 0]} rotation={FLAT_RING}>
        <torusGeometry args={[BASKET_RADIUS, RIM_TUBE, 16, 56]} />
        <meshStandardMaterial {...STEEL_BRIGHT} />
      </mesh>

      {/* footed base ring */}
      <mesh position={[0, 0.02, 0]} rotation={FLAT_RING}>
        <torusGeometry args={[BASKET_RADIUS * 0.9, FOOT_TUBE, 12, 48]} />
        <meshStandardMaterial {...STEEL_BRIGHT} />
      </mesh>
    </group>
  );
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
      <BasketFrame base={base} />
    </>
  );
}
