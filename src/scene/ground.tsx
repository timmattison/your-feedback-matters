import { useEffect } from 'react';
import { usePlane } from '@react-three/cannon';

export function Ground({ y }: { y: number }) {
  const [, api] = usePlane(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, y, 0],
  }));
  // The floor's y tracks the viewport bottom, which changes on window resize.
  // A cannon body's factory only runs once at mount, so teleport the static
  // collider to match; otherwise it lags behind the moved scene.
  useEffect(() => {
    api.position.set(0, y, 0);
  }, [api, y]);
  return null;
}
