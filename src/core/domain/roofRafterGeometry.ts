import { pointInPolygonMm } from "@/core/domain/wallLumberPlan2dGeometry";
import type { Point2D } from "@/core/geometry/types";

import { rawRoofZUpAtPlanPointMm } from "./roofGroupHeightAdjust";
import type { RoofPlaneEntity } from "./roofPlane";
import { roofPlaneDrainUnitPlanMm, roofPlanePolygonMm } from "./roofPlane";
import type { FloorBeamEntity } from "./floorBeam";
import { beamPlanThicknessAndVerticalMm } from "./floorBeamSection";
import { floorBeamWorldBottomMmFromMap, type LayerVerticalSlice } from "./layerVerticalStack";
import { getProfileById } from "./profileOps";
import type { Project } from "./project";

/**
 * Отсечение отрезка выпуклым/простым полигоном: возвращает подотрезок внутри полигона
 * (первая найденная нетривиальная компонента), либо null.
 */
export function clipSegmentToPolygon2dMm(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  poly: readonly Point2D[],
): { readonly sx: number; readonly sy: number; readonly ex: number; readonly ey: number } | null {
  if (poly.length < 3) {
    return null;
  }
  const ts: number[] = [];
  const pushT = (t: number) => {
    if (!Number.isFinite(t)) {
      return;
    }
    const u = Math.max(0, Math.min(1, t));
    if (!ts.some((x) => Math.abs(x - u) < 1e-6)) {
      ts.push(u);
    }
  };
  if (pointInPolygonMm(ax, ay, poly)) {
    pushT(0);
  }
  if (pointInPolygonMm(bx, by, poly)) {
    pushT(1);
  }
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p0 = poly[i]!;
    const p1 = poly[(i + 1) % n]!;
    const hit = segmentIntersectSegmentParam2d(ax, ay, bx, by, p0.x, p0.y, p1.x, p1.y);
    if (hit != null) {
      pushT(hit);
    }
  }
  ts.sort((a, b) => a - b);
  if (ts.length < 2) {
    return null;
  }
  for (let k = 0; k < ts.length - 1; k++) {
    const t0 = ts[k]!;
    const t1 = ts[k + 1]!;
    if (t1 - t0 < 1e-7) {
      continue;
    }
    const tm = (t0 + t1) * 0.5;
    const mx = ax + (bx - ax) * tm;
    const my = ay + (by - ay) * tm;
    if (pointInPolygonMm(mx, my, poly)) {
      return {
        sx: ax + (bx - ax) * t0,
        sy: ay + (by - ay) * t0,
        ex: ax + (bx - ax) * t1,
        ey: ay + (by - ay) * t1,
      };
    }
  }
  return null;
}

function segmentIntersectSegmentParam2d(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number | null {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < epsLine) {
    return null;
  }
  const qpx = cx - ax;
  const qpy = cy - ay;
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  if (t >= -epsLine && t <= 1 + epsLine && u >= -epsLine && u <= 1 + epsLine) {
    return Math.max(0, Math.min(1, t));
  }
  return null;
}

const epsLine = 1e-9;

/** Ближайшая точка на полилинии конька (один или несколько отрезков) к точке плана. */
export function closestPointOnRidgePolylineMm(
  segments: readonly { readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number }[],
  px: number,
  py: number,
): { readonly x: number; readonly y: number } | null {
  let best: { readonly x: number; readonly y: number; readonly d2: number } | null = null;
  for (const s of segments) {
    const abx = s.bx - s.ax;
    const aby = s.by - s.ay;
    const len2 = abx * abx + aby * aby;
    if (len2 < 1e-18) {
      continue;
    }
    let t = ((px - s.ax) * abx + (py - s.ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const x = s.ax + abx * t;
    const y = s.ay + aby * t;
    const dx = px - x;
    const dy = py - y;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) {
      best = { x, y, d2 };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

/** Расстояние от точки до отрезка в плане (мм). */
export function distancePointToSegmentMm(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-18) {
    return Math.hypot(px - ax, py - ay);
  }
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + abx * t;
  const y = ay + aby * t;
  return Math.hypot(px - x, py - y);
}

/** Точка строго внутри полигона или в пределах eps от ребра (ray-cast часто отсекает границу). */
export function pointInPolygonOrNearBoundaryMm(
  px: number,
  py: number,
  poly: readonly Point2D[],
  epsMm: number,
): boolean {
  if (pointInPolygonMm(px, py, poly)) {
    return true;
  }
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    if (distancePointToSegmentMm(px, py, a.x, a.y, b.x, b.y) <= epsMm) {
      return true;
    }
  }
  return false;
}

/**
 * Минимальное t > tol: первая точка луча q + t·û на границе полигона (вдоль стока к карнизу).
 */
export function rayForwardToPolygonBoundaryMinTMm(
  qx: number,
  qy: number,
  uxn: number,
  uyn: number,
  poly: readonly Point2D[],
  tolMm = 0.2,
): number | null {
  let best: number | null = null;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const ax = poly[i]!.x;
    const ay = poly[i]!.y;
    const bx = poly[(i + 1) % n]!.x;
    const by = poly[(i + 1) % n]!.y;
    const rx = bx - ax;
    const ry = by - ay;
    const den = uxn * ry - uyn * rx;
    if (Math.abs(den) < 1e-15) {
      continue;
    }
    const t = ((ax - qx) * ry - (ay - qy) * rx) / den;
    const s = ((ax - qx) * uyn - (ay - qy) * uxn) / den;
    if (t > tolMm && s >= -tolMm && s <= 1 + tolMm) {
      if (best == null || t < best) {
        best = t;
      }
    }
  }
  return best;
}

function roofZUpAtPlanPointAdjustedMm(
  rp: RoofPlaneEntity,
  baseMm: number,
  zAdjMm: number,
  px: number,
  py: number,
): number {
  return rawRoofZUpAtPlanPointMm(rp, baseMm, px, py) + zAdjMm;
}

/**
 * Нижняя точка стропила на скате: вдоль стока от точки на коньке до высоты zTarget.
 * Луч ограничивается полигоном ската, чтобы стопа не уезжала за карниз при численном поиске.
 */
export function footPlanAlongDrainToRoofElevationMm(
  rp: RoofPlaneEntity,
  baseMm: number,
  zAdjMm: number,
  qx: number,
  qy: number,
  zTargetMm: number,
): { readonly x: number; readonly y: number } | null {
  const { uxn, uyn } = roofPlaneDrainUnitPlanMm(rp);
  const poly = roofPlanePolygonMm(rp);
  const tBoundary = rayForwardToPolygonBoundaryMinTMm(qx, qy, uxn, uyn, poly);
  const tMaxGeom = tBoundary != null ? Math.max(0, tBoundary - 0.5) : 2_000_000;

  const z0 = roofZUpAtPlanPointAdjustedMm(rp, baseMm, zAdjMm, qx, qy);
  if (zTargetMm >= z0 - 0.5) {
    if (zTargetMm <= z0 + 0.5) {
      return { x: qx, y: qy };
    }
    return null;
  }
  let tLo = 0;
  let tHi = Math.min(200_000, tMaxGeom);
  let zHi = roofZUpAtPlanPointAdjustedMm(rp, baseMm, zAdjMm, qx + uxn * tHi, qy + uyn * tHi);
  let guard = 0;
  while (zHi > zTargetMm && tHi < tMaxGeom - 1e-6 && guard < 24) {
    tHi = Math.min(tHi * 2, tMaxGeom);
    zHi = roofZUpAtPlanPointAdjustedMm(rp, baseMm, zAdjMm, qx + uxn * tHi, qy + uyn * tHi);
    guard++;
  }
  if (zHi > zTargetMm) {
    return null;
  }
  for (let i = 0; i < 56; i++) {
    const tm = (tLo + tHi) * 0.5;
    const zm = roofZUpAtPlanPointAdjustedMm(rp, baseMm, zAdjMm, qx + uxn * tm, qy + uyn * tm);
    if (zm > zTargetMm) {
      tLo = tm;
    } else {
      tHi = tm;
    }
  }
  const t = tHi;
  return { x: qx + uxn * t, y: qy + uyn * t };
}

export function floorBeamTopElevationMm(
  project: Project,
  beam: FloorBeamEntity,
  verticalById: ReadonlyMap<string, LayerVerticalSlice>,
): number | null {
  const profile = getProfileById(project, beam.profileId);
  if (!profile) {
    return null;
  }
  const { verticalMm } = beamPlanThicknessAndVerticalMm(profile, beam.sectionRolled);
  if (!(verticalMm > 0)) {
    return null;
  }
  const bottom = floorBeamWorldBottomMmFromMap(beam, verticalById, project);
  return bottom + verticalMm;
}
