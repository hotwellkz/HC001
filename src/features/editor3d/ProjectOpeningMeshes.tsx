import { useMemo } from "react";
import { DoubleSide } from "three";

import { buildOpening3dSpecsForProject } from "@/core/domain/opening3dAssemblySpecs";
import type { Opening3dMeshKind, Opening3dMeshSpec } from "@/core/domain/opening3dAssemblySpecs";
import type { Project } from "@/core/domain/project";

import { isOpening3dMeshVisible } from "./view3dVisibility";

interface ProjectOpeningMeshesProps {
  readonly project: Project;
  readonly selectedReactKey: string | null;
  readonly onSelect: (spec: Opening3dMeshSpec) => void;
}

function materialForKind(kind: Opening3dMeshKind): {
  readonly physical?: boolean;
  readonly color: number;
  readonly roughness: number;
  readonly metalness: number;
  readonly transmission?: number;
  readonly opacity?: number;
  readonly depthWrite?: boolean;
} {
  switch (kind) {
    case "window_glass":
      return {
        physical: true,
        color: 0xa8c5e8,
        roughness: 0.12,
        metalness: 0,
        transmission: 0.9,
        opacity: 0.92,
        depthWrite: false,
      };
    case "window_frame":
    case "window_mullion":
      return { color: 0xd8dee8, roughness: 0.42, metalness: 0.06 };
    default:
      return { color: 0xc49a6a, roughness: 0.52, metalness: 0.05 };
  }
}

function OpeningMesh({
  spec,
  selected,
  onSelect,
}: {
  readonly spec: Opening3dMeshSpec;
  readonly selected: boolean;
  readonly onSelect: (spec: Opening3dMeshSpec) => void;
}) {
  const m = materialForKind(spec.kind);
  return (
    <group>
      <mesh
        position={spec.position}
        rotation={[0, spec.rotationY, 0]}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(spec);
        }}
      >
        <boxGeometry args={[spec.width, spec.height, spec.depth]} />
        {m.physical ? (
          <meshPhysicalMaterial
            color={m.color}
            roughness={m.roughness}
            metalness={m.metalness}
            transmission={m.transmission ?? 0.9}
            thickness={0.2}
            transparent
            opacity={m.opacity ?? 0.9}
            depthWrite={m.depthWrite !== false}
            side={DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={m.color}
            roughness={m.roughness}
            metalness={m.metalness}
            side={DoubleSide}
          />
        )}
      </mesh>
      {selected ? (
        <mesh position={spec.position} rotation={[0, spec.rotationY, 0]}>
          <boxGeometry args={[spec.width * 1.015, spec.height * 1.015, spec.depth * 1.015]} />
          <meshBasicMaterial color={0xf2c94c} wireframe transparent opacity={0.95} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * Оконные блоки (рама, стекло, импосты) и элементы обрамления из openingFramingPieces.
 * Зависит только от project — синхронизация с 2D через store.
 */
export function ProjectOpeningMeshes({ project, selectedReactKey, onSelect }: ProjectOpeningMeshesProps) {
  const specs = useMemo(() => {
    return buildOpening3dSpecsForProject(project).filter((s) => isOpening3dMeshVisible(s, project));
  }, [project]);

  if (specs.length === 0) {
    return null;
  }

  return (
    <group name="project-openings-3d">
      {specs.map((s) => (
        <OpeningMesh key={s.reactKey} spec={s} selected={selectedReactKey === s.reactKey} onSelect={onSelect} />
      ))}
    </group>
  );
}
