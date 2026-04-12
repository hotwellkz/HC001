import { Quaternion, Vector3 } from "three";

import { beamPlanThicknessAndVerticalMm } from "@/core/domain/floorBeamSection";
import { getProfileById } from "@/core/domain/profileOps";
import type { ProfileMaterialType } from "@/core/domain/profile";
import type { Project } from "@/core/domain/project";
import type { RoofRafterEntity } from "@/core/domain/roofRafter";
import { getLayerById } from "@/core/domain/layerOps";

import { isProjectLayerVisibleIn3d } from "./view3dVisibility";

const MM_TO_M = 0.001;
const MIN_LEN_MM = 1;

export interface RoofRafterRenderMeshSpec {
  readonly reactKey: string;
  readonly rafterId: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly materialType: ProfileMaterialType | "default";
}

function planToThreeMm(pxMm: number, pyMm: number, zUpMm: number): Vector3 {
  return new Vector3(pxMm * MM_TO_M, zUpMm * MM_TO_M, -pyMm * MM_TO_M);
}

export function roofRaftersForScene3d(project: Project): readonly RoofRafterEntity[] {
  return project.roofRafters.filter((r) => {
    const layer = getLayerById(project, r.layerId);
    if (layer?.isVisible === false) {
      return false;
    }
    if (!isProjectLayerVisibleIn3d(r.layerId, project)) {
      return false;
    }
    return true;
  });
}

export function roofRaftersToMeshSpecs(project: Project, rafters: readonly RoofRafterEntity[]): RoofRafterRenderMeshSpec[] {
  const out: RoofRafterRenderMeshSpec[] = [];
  for (const r of rafters) {
    const profile = getProfileById(project, r.profileId);
    if (!profile) {
      continue;
    }
    const { planThicknessMm, verticalMm } = beamPlanThicknessAndVerticalMm(profile, r.sectionRolled);
    if (!(planThicknessMm > 0) || !(verticalMm > 0)) {
      continue;
    }
    const foot = planToThreeMm(r.footPlanMm.x, r.footPlanMm.y, r.footElevationMm);
    const ridge = planToThreeMm(r.ridgePlanMm.x, r.ridgePlanMm.y, r.ridgeElevationMm);
    const dir = ridge.clone().sub(foot);
    const lenM = dir.length();
    if (lenM < MIN_LEN_MM * MM_TO_M) {
      continue;
    }
    dir.normalize();
    const center = foot.clone().add(ridge).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
    const mt: ProfileMaterialType | "default" = profile.layers[0]?.materialType ?? "wood";
    out.push({
      reactKey: r.id,
      rafterId: r.id,
      position: [center.x, center.y, center.z],
      quaternion: [q.x, q.y, q.z, q.w],
      width: planThicknessMm * MM_TO_M,
      height: verticalMm * MM_TO_M,
      depth: lenM,
      materialType: mt,
    });
  }
  return out;
}
