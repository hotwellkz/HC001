import { computeLayerVerticalStack, floorBeamWorldBottomMmFromMap } from "@/core/domain/layerVerticalStack";
import { getProfileById } from "@/core/domain/profileOps";
import type { ProfileMaterialType } from "@/core/domain/profile";
import type { Project } from "@/core/domain/project";
import type { FloorBeamEntity } from "@/core/domain/floorBeam";
import { beamPlanThicknessAndVerticalMm } from "@/core/domain/floorBeamSection";
import { resolveFloorBeamCenterlineInPlan } from "@/core/domain/floorBeamGeometry";
import { getLayerById } from "@/core/domain/layerOps";

const MM_TO_M = 0.001;
const MIN_LEN_MM = 1;

function thicknessNormalUnit(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): { readonly lenMm: number; readonly ux: number; readonly uy: number } {
  const dxMm = ex - sx;
  const dyMm = ey - sy;
  const lenMm = Math.hypot(dxMm, dyMm);
  if (lenMm < MIN_LEN_MM) {
    return { lenMm: 0, ux: 1, uy: 0 };
  }
  return { lenMm, ux: dxMm / lenMm, uy: dyMm / lenMm };
}

export interface FloorBeamRenderMeshSpec {
  readonly reactKey: string;
  readonly beamId: string;
  readonly position: readonly [number, number, number];
  readonly rotationY: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly materialType: ProfileMaterialType | "default";
}

/** Балки на видимых слоях (как стены в 3D). */
export function floorBeamsForScene3d(project: Project): readonly FloorBeamEntity[] {
  return project.floorBeams.filter((b) => {
    const layer = getLayerById(project, b.layerId);
    if (layer?.isVisible === false) {
      return false;
    }
    return true;
  });
}

export function floorBeamsToMeshSpecs(
  project: Project,
  beams: readonly FloorBeamEntity[],
): FloorBeamRenderMeshSpec[] {
  const verticalById = computeLayerVerticalStack(project);
  const out: FloorBeamRenderMeshSpec[] = [];
  for (const beam of beams) {
    const profile = getProfileById(project, beam.profileId);
    if (!profile) {
      continue;
    }
    const { planThicknessMm, verticalMm } = beamPlanThicknessAndVerticalMm(profile, beam.sectionRolled);
    if (!(planThicknessMm > 0) || !(verticalMm > 0)) {
      continue;
    }
    const cl = resolveFloorBeamCenterlineInPlan(project, beam);
    if (!cl) {
      continue;
    }
    const sx = cl.centerStart.x;
    const sy = cl.centerStart.y;
    const ex = cl.centerEnd.x;
    const ey = cl.centerEnd.y;
    const { lenMm, ux, uy } = thicknessNormalUnit(sx, sy, ex, ey);
    if (lenMm < MIN_LEN_MM) {
      continue;
    }
    const dxMm = ex - sx;
    const dyMm = ey - sy;
    const dxM = dxMm * MM_TO_M;
    const dzM = -dyMm * MM_TO_M;
    const bottomMm = floorBeamWorldBottomMmFromMap(beam, verticalById, project);
    const bottomM = bottomMm * MM_TO_M;
    const rotationY = Math.atan2(dxM, dzM);
    const uMid = lenMm / 2;
    const yMid = verticalMm / 2;
    const px = sx + ux * uMid;
    const py = sy + uy * uMid;
    const cx = px * MM_TO_M;
    const cz = -py * MM_TO_M;
    const cy = bottomM + yMid * MM_TO_M;
    const mt: ProfileMaterialType | "default" = profile.layers[0]?.materialType ?? "wood";
    out.push({
      reactKey: beam.id,
      beamId: beam.id,
      position: [cx, cy, cz],
      rotationY,
      width: planThicknessMm * MM_TO_M,
      height: verticalMm * MM_TO_M,
      depth: lenMm * MM_TO_M,
      materialType: mt,
    });
  }
  return out;
}
