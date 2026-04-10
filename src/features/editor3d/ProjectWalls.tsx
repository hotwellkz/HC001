import { useMemo } from "react";
import { DoubleSide } from "three";

import type { Project } from "@/core/domain/project";

import { SELECTION_BOX_OUTLINE_3D } from "./calculationSeamVisual3d";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import { meshStandardPresetForLayerOrDefault } from "./materials3d";
import { selectWallsForScene3d } from "./selectors/walls3d";
import { isWallMeshSpecVisible } from "./view3dVisibility";
import { wallsToMeshSpecs, type WallRenderMeshSpec } from "./wallMeshSpec";

interface ProjectWallsProps {
  readonly project: Project;
  readonly selectedReactKey?: string | null;
  readonly onSelectWall?: (spec: WallRenderMeshSpec) => void;
}

/**
 * Меши стен из domain model; обновляется при любом изменении project.
 */
export function ProjectWalls({ project, selectedReactKey = null, onSelectWall }: ProjectWallsProps) {
  const specs = useMemo(() => {
    const walls = selectWallsForScene3d(project);
    const all = wallsToMeshSpecs(project, walls);
    return all.filter((s) => isWallMeshSpecVisible(s, project));
  }, [project]);
  return (
    <group name="project-walls">
      {specs.map((s) => {
        const preset = meshStandardPresetForLayerOrDefault(s.materialType);
        return (
          <group key={s.reactKey}>
            <mesh
              position={s.position}
              rotation={[0, s.rotationY, 0]}
              castShadow
              receiveShadow
              onPointerDown={(e) => {
                if (!onSelectWall) {
                  return;
                }
                e.stopPropagation();
                onSelectWall(s);
              }}
            >
              <boxGeometry args={[s.width, s.height, s.depth]} />
              <meshStandardMaterial
                color={preset.color}
                roughness={preset.roughness}
                metalness={preset.metalness}
                side={DoubleSide}
              />
            </mesh>
            {selectedReactKey === s.reactKey ? (
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
          </group>
        );
      })}
    </group>
  );
}
