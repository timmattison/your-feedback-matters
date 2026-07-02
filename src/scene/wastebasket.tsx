import { BASKET_HEIGHT, BASKET_RADIUS } from '../core/constants';

export function Wastebasket({ base }: { base: [number, number, number] }) {
  return (
    <mesh position={[base[0], base[1] + BASKET_HEIGHT / 2, base[2]]}>
      <cylinderGeometry
        args={[BASKET_RADIUS, BASKET_RADIUS * 0.75, BASKET_HEIGHT, 24, 4, true]}
      />
      <meshStandardMaterial color="#4a4a4a" wireframe />
    </mesh>
  );
}
