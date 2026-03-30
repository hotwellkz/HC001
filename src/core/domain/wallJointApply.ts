import { newEntityId } from "./ids";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import type { Wall } from "./wall";
import type { WallJoint } from "./wallJoint";
import { closestPointOnSegment, computeCornerJointGeometry, computeTeeAbutmentGeometry } from "./wallJointGeometry";
import { replaceWallInProject } from "./wallMutations";

export type WallJointApplyResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

function getWall(project: Project, id: string): Wall | undefined {
  return project.walls.find((w) => w.id === id);
}

/**
 * Сохраняет узел и обновляет геометрию стен (угловой butt/miter).
 * Первая выбранная стена — главная (butt).
 */
export function applyCornerWallJoint(
  project: Project,
  kind: "CORNER_BUTT" | "CORNER_MITER",
  wallAId: string,
  wallAEnd: "start" | "end",
  wallBId: string,
  wallBEnd: "start" | "end",
): WallJointApplyResult {
  const layerId = project.activeLayerId;
  const wa = getWall(project, wallAId);
  const wb = getWall(project, wallBId);
  if (!wa || !wb) {
    return { ok: false, error: "Стена не найдена." };
  }
  if (wa.layerId !== layerId || wb.layerId !== layerId) {
    return { ok: false, error: "Обе стены должны быть на активном слое." };
  }

  const geom = computeCornerJointGeometry(kind, wa, wallAEnd, wb, wallBEnd);
  if (!geom.ok) {
    return { ok: false, error: geom.error };
  }

  const { wallMain, wallSecondary } = geom.value;
  const joint: WallJoint = {
    id: newEntityId(),
    kind,
    wallAId,
    wallAEnd,
    wallBId,
    wallBEnd,
  };

  let next = replaceWallInProject(project, wallMain.id, wallMain);
  next = replaceWallInProject(next, wallSecondary.id, wallSecondary);
  next = touchProjectMeta({
    ...next,
    wallJoints: [...next.wallJoints, joint],
  });
  return { ok: true, project: next };
}

/**
 * T-примыкание: первый выбор — торец примыкающей стены, второй — сегмент основной.
 */
export function applyTeeWallJoint(
  project: Project,
  abuttingWallId: string,
  abuttingEnd: "start" | "end",
  mainWallId: string,
  pointOnMainMm: { readonly x: number; readonly y: number },
): WallJointApplyResult {
  const layerId = project.activeLayerId;
  const wa = getWall(project, abuttingWallId);
  const wb = getWall(project, mainWallId);
  if (!wa || !wb) {
    return { ok: false, error: "Стена не найдена." };
  }
  if (wa.layerId !== layerId || wb.layerId !== layerId) {
    return { ok: false, error: "Обе стены должны быть на активном слое." };
  }

  const geom = computeTeeAbutmentGeometry(wa, abuttingEnd, wb, pointOnMainMm);
  if (!geom.ok) {
    return { ok: false, error: geom.error };
  }

  const { point: P } = closestPointOnSegment(wb.start, wb.end, pointOnMainMm);

  const joint: WallJoint = {
    id: newEntityId(),
    kind: "T_ABUTMENT",
    wallAId: abuttingWallId,
    wallAEnd: abuttingEnd,
    wallBId: mainWallId,
    teePointOnMainMm: { x: P.x, y: P.y },
  };

  const next = replaceWallInProject(project, geom.value.abutting.id, geom.value.abutting);
  return {
    ok: true,
    project: touchProjectMeta({
      ...next,
      wallJoints: [...next.wallJoints, joint],
    }),
  };
}
