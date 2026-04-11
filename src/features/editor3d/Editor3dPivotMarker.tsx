import { Line } from "@react-three/drei";

const ARM = 0.052;
const COLOR = "#7eb0ff";

/** Ненавязчивый маркер точки orbit-pivot (перекрёстные линии в мировых координатах). */
export function Editor3dPivotMarker({ point }: { readonly point: readonly [number, number, number] | null }) {
  if (point == null) {
    return null;
  }

  return (
    <group position={point} renderOrder={48}>
      <Line
        points={[
          [-ARM, 0, 0],
          [ARM, 0, 0],
        ]}
        color={COLOR}
        lineWidth={1}
        transparent
        opacity={0.36}
        depthTest
        depthWrite={false}
      />
      <Line
        points={[
          [0, -ARM, 0],
          [0, ARM, 0],
        ]}
        color={COLOR}
        lineWidth={1}
        transparent
        opacity={0.36}
        depthTest
        depthWrite={false}
      />
      <Line
        points={[
          [0, 0, -ARM],
          [0, 0, ARM],
        ]}
        color={COLOR}
        lineWidth={1}
        transparent
        opacity={0.36}
        depthTest
        depthWrite={false}
      />
    </group>
  );
}
