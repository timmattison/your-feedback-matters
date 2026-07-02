import { useBox, useCylinder } from '@react-three/cannon';
import * as THREE from 'three';
import {
  BASKET_BOTTOM_RADIUS,
  BASKET_HEIGHT,
  BASKET_RADIUS,
} from '../core/constants';
import {
  basketRadiusAtHeightFraction,
  basketWallSlant,
} from '../core/basket-geometry';

// Physics: a sealed ring of thin static boxes standing in for the wall, plus a
// floor disk. The boxes are slanted to follow the same taper as the visible
// basket (wide mouth, narrower floor) — both walls are built from
// basketRadiusAtHeightFraction, so the ball rests against a wall that lines up
// exactly with the one it appears to touch.
const WALL_SEGMENTS = 12;

// Visuals: a shaded steel wire-mesh bin — slanted vertical ribs crossed by
// horizontal rings that shrink toward the floor, capped with a rounded rim at
// the mouth and a matching rim where the ribs meet a tapered floor plate.
const VERTICAL_RIBS = 24;
// fractions of BASKET_HEIGHT; evenly spread so the taller bin keeps the same
// wire-mesh density as the original short one.
const RING_HEIGHTS = [0.14, 0.31, 0.48, 0.65, 0.82];
const RIB_RADIUS = 0.02;
const RING_TUBE = 0.022;
const RIM_TUBE = 0.05;
const FOOT_TUBE = 0.045;
const FLOOR_THICKNESS = 0.1;
// height fraction the floor plate / foot rim sit at (just above the very bottom)
const FOOT_FRACTION = FLOOR_THICKNESS / BASKET_HEIGHT;

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

/**
 * Placement of a full-height wall element (a rib or a physics segment) at the
 * given azimuth. The element spans floor to mouth along the taper, so it sits at
 * the mid-height radius and leans outward: its bottom reaches
 * BASKET_BOTTOM_RADIUS and its top reaches BASKET_RADIUS. The quaternion aligns
 * the element's local +Y (its length) with the slant while keeping its width
 * tangential and its thin face radial.
 */
function slantTransform(angle: number): {
  position: [number, number, number];
  quaternion: [number, number, number, number];
} {
  const midRadius = basketRadiusAtHeightFraction(0.5);
  const run = BASKET_RADIUS - BASKET_BOTTOM_RADIUS;
  const tangential = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const along = new THREE.Vector3(
    Math.cos(angle) * run,
    BASKET_HEIGHT,
    Math.sin(angle) * run,
  ).normalize();
  const radial = new THREE.Vector3()
    .crossVectors(tangential, along)
    .normalize();
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(tangential, along, radial),
  );
  return {
    position: [
      Math.cos(angle) * midRadius,
      BASKET_HEIGHT / 2,
      Math.sin(angle) * midRadius,
    ],
    quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
  };
}

/** One static box approximating a slanted slice of the tapered wall. */
function WallSegment({
  base,
  index,
}: {
  base: [number, number, number];
  index: number;
}) {
  const angle = (index / WALL_SEGMENTS) * Math.PI * 2;
  const segmentWidth = (2 * Math.PI * BASKET_RADIUS) / WALL_SEGMENTS;
  const { length } = basketWallSlant();
  const { position, quaternion } = slantTransform(angle);
  useBox(() => ({
    type: 'Static',
    args: [segmentWidth * 1.1, length, 0.05],
    position: [
      base[0] + position[0],
      base[1] + position[1],
      base[2] + position[2],
    ],
    quaternion,
  }));
  return null;
}

/** The shaded, solid wire-mesh basket the user actually sees. */
function BasketFrame({ base }: { base: [number, number, number] }) {
  const { length: ribLength } = basketWallSlant();
  const footRadius = basketRadiusAtHeightFraction(FOOT_FRACTION);
  return (
    <group position={base}>
      {/* tapered floor plate so the ribs land on it and you can't see through
          the bottom. It matches the wall taper, narrowing to
          BASKET_BOTTOM_RADIUS at its base so its edge stays flush with the
          ribs. */}
      <mesh position={[0, FLOOR_THICKNESS / 2, 0]}>
        <cylinderGeometry
          args={[footRadius, BASKET_BOTTOM_RADIUS, FLOOR_THICKNESS, 40]}
        />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      {/* slanted vertical ribs, wider at the mouth than at the floor */}
      {Array.from({ length: VERTICAL_RIBS }, (_, i) => {
        const angle = (i / VERTICAL_RIBS) * Math.PI * 2;
        const { position, quaternion } = slantTransform(angle);
        return (
          <mesh key={`rib-${i}`} position={position} quaternion={quaternion}>
            <cylinderGeometry args={[RIB_RADIUS, RIB_RADIUS, ribLength, 8]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        );
      })}

      {/* horizontal rings weaving through the ribs, shrinking toward the floor */}
      {RING_HEIGHTS.map((h) => (
        <mesh
          key={`ring-${h}`}
          position={[0, h * BASKET_HEIGHT, 0]}
          rotation={FLAT_RING}
        >
          <torusGeometry
            args={[basketRadiusAtHeightFraction(h), RING_TUBE, 12, 48]}
          />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}

      {/* rounded rim at the mouth (the full design width) */}
      <mesh position={[0, BASKET_HEIGHT, 0]} rotation={FLAT_RING}>
        <torusGeometry args={[BASKET_RADIUS, RIM_TUBE, 16, 56]} />
        <meshStandardMaterial {...STEEL_BRIGHT} />
      </mesh>

      {/* bottom rim where the ribs meet the floor — mirrors the top rim and
          ties the ribs to the tapered floor plate */}
      <mesh position={[0, FLOOR_THICKNESS, 0]} rotation={FLAT_RING}>
        <torusGeometry args={[footRadius, FOOT_TUBE, 12, 48]} />
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
