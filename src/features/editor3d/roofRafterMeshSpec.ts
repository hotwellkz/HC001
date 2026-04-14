import { Quaternion, Vector3 } from "three";

import { beamPlanThicknessAndVerticalFromOrientationMm } from "@/core/domain/floorBeamSection";
import { getProfileById } from "@/core/domain/profileOps";
import type { ProfileMaterialType } from "@/core/domain/profile";
import type { Project } from "@/core/domain/project";
import { resolveRoofRafterSectionOrientation, type RoofRafterEntity } from "@/core/domain/roofRafter";
import { roofSlopeOutwardUnitNormalThreeMm } from "@/core/geometry/roofAssemblyGeometry3d";

import { isProjectLayerVisibleIn3d } from "./view3dVisibility";

const MM_TO_M = 0.001;
const MIN_LEN_MM = 1;
/** Небольшой зазор от расчётной плоскости, чтобы не было z-fighting с мембраной/обрешёткой. */
const ROOF_RAFTER_BELOW_STRUCTURAL_PLANE_GAP_MM = 2;

/**
 * Расстояние (мм) вдоль наружной нормали ската от опорной линии стропила до центра бокса.
 * Ось стропилы задаётся `setFromUnitVectors` без фикса roll вокруг оси, поэтому половина только
 * «толщины» недостаточна: вектор нормали может проецироваться и на узкую, и на высокую сторону
 * сечения. Берём радиус описанной окружности половин прямоугольника сечения в плоскости ⊥ оси
 * (гарантированно весь бокс оказывается под плоскостью ската).
 */
function rafterCenterOffsetAlongInwardNormalMm(planThicknessMm: number, verticalMm: number): number {
  return Math.hypot(planThicknessMm * 0.5, verticalMm * 0.5) + ROOF_RAFTER_BELOW_STRUCTURAL_PLANE_GAP_MM;
}

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

/**
 * Смещение центра призматического стропила вдоль наружной нормали ската (только translation).
 * Опорная линия foot–ridge лежит на той же расчётной плоскости ската, что `rawRoofZ` / мембрана в
 * {@link buildRoofSlopeSurfaceMeshMm}. Центр бокса переносится в сторону чердака на
 * {@link rafterCenterOffsetAlongInwardNormalMm} вдоль **−n_out**, чтобы материал сечения не
 * заходил в пирог (пароплёнка, обрешётка выше этой плоскости по нормали).
 */
function offsetRafterCenterBelowRoofPlaneMm(
  centerM: Vector3,
  roofPlaneId: string,
  project: Project,
  offsetAlongInwardNormalMm: number,
): void {
  const rp = project.roofPlanes.find((p) => p.id === roofPlaneId);
  if (!rp || !(offsetAlongInwardNormalMm > 0)) {
    return;
  }
  const n = roofSlopeOutwardUnitNormalThreeMm(rp);
  const outward = new Vector3(n[0], n[1], n[2]);
  centerM.addScaledVector(outward, -offsetAlongInwardNormalMm * MM_TO_M);
}

/**
 * Как у узла кровли в 3D: только `hidden3dProjectLayerIds`, без `Layer.isVisible` (2D).
 * Иначе при скрытом на плане слое крыши скаты остаются в 3D, а стропила пропадали бы.
 */
export function roofRaftersForScene3d(project: Project): readonly RoofRafterEntity[] {
  return project.roofRafters.filter((r) => isProjectLayerVisibleIn3d(r.layerId, project));
}

export function roofRaftersToMeshSpecs(project: Project, rafters: readonly RoofRafterEntity[]): RoofRafterRenderMeshSpec[] {
  const out: RoofRafterRenderMeshSpec[] = [];
  for (const r of rafters) {
    const profile = getProfileById(project, r.profileId);
    if (!profile) {
      continue;
    }
    const orientation = resolveRoofRafterSectionOrientation(r);
    const { planThicknessMm, verticalMm } = beamPlanThicknessAndVerticalFromOrientationMm(profile, orientation);
    if (!(planThicknessMm > 0) || !(verticalMm > 0)) {
      continue;
    }
    const offsetAlongNormalMm = rafterCenterOffsetAlongInwardNormalMm(planThicknessMm, verticalMm);
    const foot = planToThreeMm(r.footPlanMm.x, r.footPlanMm.y, r.footElevationMm);
    const ridge = planToThreeMm(r.ridgePlanMm.x, r.ridgePlanMm.y, r.ridgeElevationMm);
    const dir = ridge.clone().sub(foot);
    const lenM = dir.length();
    if (lenM < MIN_LEN_MM * MM_TO_M) {
      continue;
    }
    dir.normalize();
    const center = foot.clone().add(ridge).multiplyScalar(0.5);
    offsetRafterCenterBelowRoofPlaneMm(center, r.roofPlaneId, project, offsetAlongNormalMm);

    /** Ориентация только по оси стропилы (как до правки с basis); сечение «на ребро» задаётся размерами planThickness × verticalMm. */
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
