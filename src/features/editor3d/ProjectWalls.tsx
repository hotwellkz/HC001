import { useMemo } from "react";
import { DoubleSide } from "three";

import type { Project } from "@/core/domain/project";

import { HOVER_BOX_OUTLINE_3D, SELECTION_BOX_OUTLINE_3D } from "./calculationSeamVisual3d";
import { editor3dPickUserData } from "./editor3dPick";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import { meshStandardPresetForLayerOrDefault } from "./materials3d";
import { selectWallsForScene3d } from "./selectors/walls3d";
import { isWallMeshSpecVisible } from "./view3dVisibility";
import { wallsToMeshSpecs } from "./wallMeshSpec";

interface ProjectWallsProps {
  readonly project: Project;
  /** Выбранная сущность — стена (id стены), без фокуса на расчётном куске. */
  readonly selectedWallEntityId: string | null;
  /** Фокус на элементе расчёта: оболочки стены не подсвечиваем как выбранные. */
  readonly calcFocus: { readonly wallId: string; readonly reactKey: string } | null;
  readonly hoverWallEntityId: string | null;
}

/**
 * Меши стен из domain model; обновляется при любом изменении project.
 */
export function ProjectWalls({ project, selectedWallEntityId, calcFocus, hoverWallEntityId }: ProjectWallsProps) {
  const specs = useMemo(() => {
    const walls = selectWallsForScene3d(project);
    const all = wallsToMeshSpecs(project, walls);
    return all.filter((s) => isWallMeshSpecVisible(s, project));
  }, [project]);
  return (
    <group name="project-walls">
      {specs.map((s) => {
        const preset = meshStandardPresetForLayerOrDefault(s.materialType);
        const pick = editor3dPickUserData({ kind: "wall", entityId: s.wallId, reactKey: s.reactKey });
        const shellSelected =
          selectedWallEntityId === s.wallId && (calcFocus == null || calcFocus.wallId !== s.wallId);
        const hoverThis = hoverWallEntityId === s.wallId && !shellSelected;
        return (
          <group key={s.reactKey}>
            <mesh
              userData={pick}
              position={s.position}
              rotation={[0, s.rotationY, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[s.width, s.height, s.depth]} />
              <meshStandardMaterial
                color={preset.color}
                roughness={preset.roughness}
                metalness={preset.metalness}
                side={DoubleSide}
              />
            </mesh>
            {shellSelected ? (
              <ExactBoxSelectionOutline
                width={s.width}
                height={s.height}
                depth={s.depth}
                position={s.position}
                rotationY={s.rotationY}
                color={SELECTION_BOX_OUTLINE_3D.color}
                opacity={SELECTION_BOX_OUTLINE_3D.opacity}
              />
            ) : null}
            {hoverThis ? (
              <ExactBoxSelectionOutline
                width={s.width}
                height={s.height}
                depth={s.depth}
                position={s.position}
                rotationY={s.rotationY}
                color={HOVER_BOX_OUTLINE_3D.color}
                opacity={HOVER_BOX_OUTLINE_3D.opacity}
              />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
