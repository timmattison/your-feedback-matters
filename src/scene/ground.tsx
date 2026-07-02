import { usePlane } from '@react-three/cannon';

export function Ground({ y }: { y: number }) {
  usePlane(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, y, 0],
  }));
  return null;
}
