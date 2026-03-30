import { useMemo } from "react";
import { DoubleSide } from "three";

import type { Project } from "@/core/domain/project";
import { buildCalculationSolidSpecsForProject } from "@/core/domain/wallCalculation3dSpecs";

import { meshStandardPresetForMaterialType } from "./materials3d";

interface ProjectCalculationMeshesProps {
  readonly project: Project;
  readonly visible: boolean;
}

/**
 * Объёмы из wallCalculations (SIP-панели + пиломатериалы); пересобирается при изменении project.
 */
export function ProjectCalculationMeshes({ project, visible }: ProjectCalculationMeshesProps) {
  const specs = useMemo(() => buildCalculationSolidSpecsForProject(project), [project]);

  if (!visible || specs.length === 0) {
    return null;
  }

  return (
    <group name="project-calculation-derived">
      {specs.map((s) => {
        const isSeam = s.source === "sip_seam";
        const preset = meshStandardPresetForMaterialType(s.materialType);
        const color = isSeam ? 0x2a2f36 : preset.color;
        const roughness = isSeam ? 0.75 : preset.roughness;
        const metalness = isSeam ? 0.02 : preset.metalness;
        return (
          <mesh
            key={s.reactKey}
            position={s.position}
            rotation={[0, s.rotationY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[s.width, s.height, s.depth]} />
            <meshStandardMaterial
              color={color}
              roughness={roughness}
              metalness={metalness}
              side={DoubleSide}
              polygonOffset
              polygonOffsetFactor={isSeam ? -1.5 : 0}
              polygonOffsetUnits={isSeam ? -1.5 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
