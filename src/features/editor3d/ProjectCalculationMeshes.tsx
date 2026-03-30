import { useMemo } from "react";

import type { Project } from "@/core/domain/project";
import { buildCalculationSolidSpecsForProject } from "@/core/domain/wallCalculation3dSpecs";

import { useSharedCalculationMeshMaterials } from "./calculationMeshMaterials3d";
import { isCalculationSolidVisible } from "./view3dVisibility";

interface ProjectCalculationMeshesProps {
  readonly project: Project;
  readonly visible: boolean;
}

/**
 * Объёмы из wallCalculations (SIP-панели + пиломатериалы); пересобирается при изменении project.
 * Тонкие швы — общие материалы (wood/eps/seam), без дублирования preset на каждый mesh.
 */
export function ProjectCalculationMeshes({ project, visible }: ProjectCalculationMeshesProps) {
  const materials = useSharedCalculationMeshMaterials();
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
        const mat =
          s.source === "lumber"
            ? materials.lumber
            : s.source === "sip"
              ? materials.eps
              : isSipSeam
                ? materials.sipSeam
                : isLumberSeam
                  ? materials.lumberSeam
                  : materials.eps;
        return (
          <mesh
            key={s.reactKey}
            material={mat}
            position={s.position}
            rotation={[0, s.rotationY, 0]}
            castShadow={!isSeam}
            receiveShadow={!isSeam}
          >
            <boxGeometry args={[s.width, s.height, s.depth]} />
          </mesh>
        );
      })}
    </group>
  );
}
