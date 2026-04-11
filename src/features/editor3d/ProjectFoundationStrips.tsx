import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";

import type { FoundationStripEntity } from "@/core/domain/foundationStrip";
import type { Project } from "@/core/domain/project";

import { buildFoundationStripExtrudeGeometry, selectFoundationStripsForScene3d } from "./foundationStripMesh3d";
import { editor3dPickUserData } from "./editor3dPick";
import { meshStandardPresetForMaterialType } from "./materials3d";

const concrete = meshStandardPresetForMaterialType("concrete");

interface ProjectFoundationStripsProps {
  readonly project: Project;
  readonly selectedStripEntityId: string | null;
  readonly hoverStripEntityId: string | null;
}

function FoundationStripMesh3d({
  entity,
  project,
  selected,
  hover,
}: {
  readonly entity: FoundationStripEntity;
  readonly project: Project;
  readonly selected: boolean;
  readonly hover: boolean;
}) {
  const built = useMemo(() => buildFoundationStripExtrudeGeometry(entity, project), [entity, project]);

  useEffect(() => {
    return () => {
      built?.geometry.dispose();
    };
  }, [built]);

  if (!built) {
    return null;
  }

  const pick = editor3dPickUserData({
    kind: "foundationStrip",
    entityId: entity.id,
    reactKey: entity.id,
  });

  const tint = selected ? 1.08 : hover ? 1.04 : 1;
  const color = concrete.color;
  const r = Math.min(255, ((color >> 16) & 0xff) * tint);
  const g = Math.min(255, ((color >> 8) & 0xff) * tint);
  const b = Math.min(255, (color & 0xff) * tint);
  const tinted = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

  return (
    <mesh
      userData={pick}
      geometry={built.geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, built.bottomM, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={tinted}
        roughness={concrete.roughness}
        metalness={concrete.metalness}
        side={DoubleSide}
      />
    </mesh>
  );
}

/**
 * Ленточный фундамент: экструзия планового контура вниз на depthMm слоя «Фундамент».
 */
export function ProjectFoundationStrips({
  project,
  selectedStripEntityId,
  hoverStripEntityId,
}: ProjectFoundationStripsProps) {
  const strips = useMemo(() => selectFoundationStripsForScene3d(project), [project]);
  return (
    <group name="project-foundation-strips">
      {strips.map((fs) => (
        <FoundationStripMesh3d
          key={fs.id}
          entity={fs}
          project={project}
          selected={selectedStripEntityId === fs.id}
          hover={hoverStripEntityId === fs.id && selectedStripEntityId !== fs.id}
        />
      ))}
    </group>
  );
}
