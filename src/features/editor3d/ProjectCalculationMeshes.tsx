import { useMemo } from "react";
import { DoubleSide } from "three";

import type { Project } from "@/core/domain/project";
import { buildCalculationSolidSpecsForProject } from "@/core/domain/wallCalculation3dSpecs";

import { CALC_SEAM_VISUAL } from "./calculationSeamVisual3d";
import { meshStandardPresetForMaterialType } from "./materials3d";
import { isCalculationSolidVisible } from "./view3dVisibility";

interface ProjectCalculationMeshesProps {
  readonly project: Project;
  readonly visible: boolean;
}

/**
 * Объёмы из wallCalculations (SIP-панели + пиломатериалы); пересобирается при изменении project.
 * Тонкие швы (sip_seam / lumber_seam) — тот же приём, что у SIP: тонкий бокс + polygonOffset.
 */
export function ProjectCalculationMeshes({ project, visible }: ProjectCalculationMeshesProps) {
  const specs = useMemo(() => {
    const all = buildCalculationSolidSpecsForProject(project);
    return all.filter((s) => isCalculationSolidVisible(s, project));
  }, [project]);

  if (!visible || specs.length === 0) {
    return null;
  }

  return (
    <group name="project-calculation-derived">
      {specs.map((s) => {
        const isSipSeam = s.source === "sip_seam";
        const isLumberSeam = s.source === "lumber_seam";
        const isSeam = isSipSeam || isLumberSeam;
        const preset = meshStandardPresetForMaterialType(s.materialType);
        const seamVis = isSipSeam ? CALC_SEAM_VISUAL.sip : isLumberSeam ? CALC_SEAM_VISUAL.lumber : null;
        const color = seamVis ? seamVis.color : preset.color;
        const roughness = seamVis ? seamVis.roughness : preset.roughness;
        const metalness = seamVis ? seamVis.metalness : preset.metalness;
        return (
          <mesh
            key={s.reactKey}
            position={s.position}
            rotation={[0, s.rotationY, 0]}
            castShadow={!isSeam}
            receiveShadow={!isSeam}
          >
            <boxGeometry args={[s.width, s.height, s.depth]} />
            <meshStandardMaterial
              color={color}
              roughness={roughness}
              metalness={metalness}
              side={DoubleSide}
              polygonOffset={isSeam}
              polygonOffsetFactor={seamVis ? seamVis.polygonOffsetFactor : 0}
              polygonOffsetUnits={seamVis ? seamVis.polygonOffsetUnits : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
