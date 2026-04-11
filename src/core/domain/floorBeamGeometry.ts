import { computeWallCenterlineFromReferenceLine } from "../geometry/linearPlacementGeometry";
import type { Point2D } from "../geometry/types";
import type { FloorBeamEntity } from "./floorBeam";
import { beamPlanThicknessAndVerticalMm } from "./floorBeamSection";
import { getProfileById } from "./profileOps";
import type { Project } from "./project";

function quadCornersAlongSegmentMm(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  offStartMm: number,
  offEndMm: number,
): Point2D[] | null {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  return [
    { x: sx + px * offStartMm, y: sy + py * offStartMm },
    { x: ex + px * offStartMm, y: ey + py * offStartMm },
    { x: ex + px * offEndMm, y: ey + py * offEndMm },
    { x: sx + px * offEndMm, y: sy + py * offEndMm },
  ];
}

export interface FloorBeamCenterlineMm {
  readonly centerStart: Point2D;
  readonly centerEnd: Point2D;
  readonly planThicknessMm: number;
}

/**
 * Осевая линия балки в плане и толщина сечения в плане с учётом ref-линии и режима привязки.
 */
export function resolveFloorBeamCenterlineInPlan(
  project: Project,
  beam: FloorBeamEntity,
): FloorBeamCenterlineMm | null {
  const profile = getProfileById(project, beam.profileId);
  if (!profile) {
    return null;
  }
  const { planThicknessMm } = beamPlanThicknessAndVerticalMm(profile, beam.sectionRolled);
  const frame = computeWallCenterlineFromReferenceLine(
    beam.refStartMm,
    beam.refEndMm,
    planThicknessMm,
    beam.linearPlacementMode,
  );
  if (!frame) {
    return null;
  }
  return {
    centerStart: frame.centerStart,
    centerEnd: frame.centerEnd,
    planThicknessMm,
  };
}

/** Четыре угла контура балки в плане (мм). */
export function floorBeamPlanQuadCornersMm(project: Project, beam: FloorBeamEntity): Point2D[] | null {
  const cl = resolveFloorBeamCenterlineInPlan(project, beam);
  if (!cl || !(cl.planThicknessMm > 0)) {
    return null;
  }
  const h = cl.planThicknessMm / 2;
  const q = quadCornersAlongSegmentMm(
    cl.centerStart.x,
    cl.centerStart.y,
    cl.centerEnd.x,
    cl.centerEnd.y,
    -h,
    h,
  );
  return q ? [...q] : null;
}

/** Ось для привязки (центр): торцы. */
export function floorBeamCenterlineEndpointsMm(
  project: Project,
  beam: FloorBeamEntity,
): { readonly cs: Point2D; readonly ce: Point2D } | null {
  const cl = resolveFloorBeamCenterlineInPlan(project, beam);
  if (!cl) {
    return null;
  }
  return { cs: cl.centerStart, ce: cl.centerEnd };
}

/**
 * Длинное ребро контура с одной стороны полосы (согласовано с quad: offStart = −h = «лево»).
 */
export function floorBeamOuterLongEdgeSegmentMm(
  project: Project,
  beam: FloorBeamEntity,
  face: "left" | "right",
): { readonly a: Point2D; readonly b: Point2D } | null {
  const cl = resolveFloorBeamCenterlineInPlan(project, beam);
  if (!cl || !(cl.planThicknessMm > 0)) {
    return null;
  }
  const sx = cl.centerStart.x;
  const sy = cl.centerStart.y;
  const ex = cl.centerEnd.x;
  const ey = cl.centerEnd.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  const h = cl.planThicknessMm / 2;
  const off = face === "left" ? -h : h;
  return {
    a: { x: sx + px * off, y: sy + py * off },
    b: { x: ex + px * off, y: ey + py * off },
  };
}
