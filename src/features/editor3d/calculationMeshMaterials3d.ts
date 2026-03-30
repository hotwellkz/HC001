import { useEffect, useMemo } from "react";
import { FrontSide, MeshStandardMaterial } from "three";

import { meshStandardPresetForMaterialType } from "./materials3d";
import { CALC_SEAM_VISUAL } from "./calculationSeamVisual3d";

/**
 * Один набор материалов на всю группу расчёта 3D: одинаковый wood/EPS для всех досок и панелей,
 * без сотен независимых meshStandardMaterial (и без расхождений по tone/shading).
 */
export function useSharedCalculationMeshMaterials(): {
  readonly lumber: MeshStandardMaterial;
  readonly eps: MeshStandardMaterial;
  readonly sipSeam: MeshStandardMaterial;
  readonly lumberSeam: MeshStandardMaterial;
} {
  const mats = useMemo(() => {
    const w = meshStandardPresetForMaterialType("wood");
    const e = meshStandardPresetForMaterialType("eps");
    const lumber = new MeshStandardMaterial({
      color: w.color,
      roughness: Math.min(0.78, w.roughness + 0.12),
      metalness: w.metalness,
      side: FrontSide,
    });
    const eps = new MeshStandardMaterial({
      color: e.color,
      roughness: e.roughness,
      metalness: e.metalness,
      side: FrontSide,
    });
    const sipSeam = new MeshStandardMaterial({
      color: CALC_SEAM_VISUAL.sip.color,
      roughness: CALC_SEAM_VISUAL.sip.roughness,
      metalness: CALC_SEAM_VISUAL.sip.metalness,
      side: FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: CALC_SEAM_VISUAL.sip.polygonOffsetFactor,
      polygonOffsetUnits: CALC_SEAM_VISUAL.sip.polygonOffsetUnits,
    });
    const lumberSeam = new MeshStandardMaterial({
      color: CALC_SEAM_VISUAL.lumber.color,
      roughness: CALC_SEAM_VISUAL.lumber.roughness,
      metalness: CALC_SEAM_VISUAL.lumber.metalness,
      side: FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: CALC_SEAM_VISUAL.lumber.polygonOffsetFactor,
      polygonOffsetUnits: CALC_SEAM_VISUAL.lumber.polygonOffsetUnits,
    });
    return { lumber, eps, sipSeam, lumberSeam };
  }, []);

  useEffect(() => {
    return () => {
      mats.lumber.dispose();
      mats.eps.dispose();
      mats.sipSeam.dispose();
      mats.lumberSeam.dispose();
    };
  }, [mats]);

  return mats;
}
