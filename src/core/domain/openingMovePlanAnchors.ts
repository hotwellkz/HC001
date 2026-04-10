import type { Point2D } from "../geometry/types";
import { distanceAlongWallAxisFromStartUnclampedMm, wallLengthMm } from "./wallCalculationGeometry";
import type { Wall } from "./wall";
import type { WallEndSide, WallJoint } from "./wallJoint";
import { miterCornerInnerOuterPlanMm, orthogonalCenterlineIntersection } from "./wallJointGeometry";

/** Совпадение торца стены с концом другой стены (мм). */
export const OPENING_MOVE_WALL_ENDPOINT_MATCH_MM = 3.5;

/** |cos(angle)| < порога — считаем стены ортогональными (не параллельными). */
const PERPENDICULAR_DOT_MAX = 0.2;

/** |cos(angle)| > порога — параллельные оси (одна линия), не «угол дома». */
const PARALLEL_DOT_MIN = 0.92;

function distMm(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Единичный вектор вдоль оси стены start → end. */
export function wallUnitAlongMm(w: Wall): { readonly x: number; readonly y: number } | null {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) {
    return null;
  }
  return { x: dx / L, y: dy / L };
}

/**
 * Толщина примыкающей стены, образующей с данной ортогональный угол в плане
 * в вершине `start` или `end` (мм). 0 — нет такого примыкания (свободный торец или не угол).
 */
export function thicknessOfOrthogonalAdjoiningWallAtEndpointMm(
  wall: Wall,
  end: "start" | "end",
  candidateWalls: readonly Wall[],
): number {
  const vertex = end === "start" ? wall.start : wall.end;
  const u0 = wallUnitAlongMm(wall);
  if (!u0) {
    return 0;
  }
  for (const w of candidateWalls) {
    if (w.id === wall.id) {
      continue;
    }
    if (w.layerId !== wall.layerId) {
      continue;
    }
    const u1 = wallUnitAlongMm(w);
    if (!u1) {
      continue;
    }
    const dot = Math.abs(u0.x * u1.x + u0.y * u1.y);
    if (dot >= PARALLEL_DOT_MIN) {
      continue;
    }
    if (dot > PERPENDICULAR_DOT_MAX) {
      continue;
    }
    const atStart = distMm(vertex, w.start) < OPENING_MOVE_WALL_ENDPOINT_MATCH_MM;
    const atEnd = distMm(vertex, w.end) < OPENING_MOVE_WALL_ENDPOINT_MATCH_MM;
    if (atStart || atEnd) {
      return Math.max(0, w.thicknessMm);
    }
  }
  return 0;
}

function planCentroidMm(walls: readonly Wall[]): Point2D {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const w of walls) {
    sx += w.start.x + w.end.x;
    sy += w.start.y + w.end.y;
    n += 2;
  }
  if (n < 1) {
    return { x: 0, y: 0 };
  }
  return { x: sx / n, y: sy / n };
}

/** Единичная нормаль к оси стены, направленная от оси к «внутренней» стороне контура (к центроиду стен слоя). */
function wallInnerUnitNormalTowardCentroid(wall: Wall, centroid: Point2D): { readonly x: number; readonly y: number } {
  const mx = (wall.start.x + wall.end.x) / 2;
  const my = (wall.start.y + wall.end.y) / 2;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { x: 0, y: 1 };
  }
  const nx = -dy / len;
  const ny = dx / len;
  const toC = (centroid.x - mx) * nx + (centroid.y - my) * ny;
  return toC >= 0 ? { x: nx, y: ny } : { x: -nx, y: -ny };
}

/**
 * Внутренний и наружный углы прямого стыка двух ортогональных стен в плане (мм, мировые координаты).
 * Основано на пересечении осей и толщинах; совпадает с визуальной логикой «внутрь/наружу» относительно центроида.
 */
export function cornerInnerOuterCornersMm(wa: Wall, wb: Wall, centroid: Point2D): { readonly inner: Point2D; readonly outer: Point2D } | null {
  const C = orthogonalCenterlineIntersection(wa, wb);
  if (!C) {
    return null;
  }
  const nA = wallInnerUnitNormalTowardCentroid(wa, centroid);
  const nB = wallInnerUnitNormalTowardCentroid(wb, centroid);
  const ha = wa.thicknessMm / 2;
  const hb = wb.thicknessMm / 2;
  return {
    inner: { x: C.x + nA.x * ha + nB.x * hb, y: C.y + nA.y * ha + nB.y * hb },
    outer: { x: C.x - nA.x * ha - nB.x * hb, y: C.y - nA.y * ha - nB.y * hb },
  };
}

function findWallJointAtEnd(wallId: string, end: WallEndSide, joints: readonly WallJoint[]): WallJoint | null {
  for (const j of joints) {
    if (j.kind === "T_ABUTMENT") {
      if (j.wallAId === wallId && j.wallAEnd === end) {
        return j;
      }
      continue;
    }
    if (j.wallAId === wallId && j.wallAEnd === end) {
      return j;
    }
    if (j.wallBId === wallId && j.wallBEnd === end) {
      return j;
    }
  }
  return null;
}

function teeInnerOuterCornersMm(main: Wall, abutting: Wall, centroid: Point2D): { readonly inner: Point2D; readonly outer: Point2D } | null {
  return cornerInnerOuterCornersMm(main, abutting, centroid);
}

function openingMoveEndReferenceAlongsMm(
  wall: Wall,
  end: WallEndSide,
  L: number,
  centroid: Point2D,
  walls: readonly Wall[],
  joints: readonly WallJoint[],
): { readonly innerAlong: number; readonly outerAlong: number } {
  const uOk = wallUnitAlongMm(wall);
  if (!uOk) {
    return end === "start" ? { innerAlong: 0, outerAlong: 0 } : { innerAlong: L, outerAlong: L };
  }

  const bonus = thicknessOfOrthogonalAdjoiningWallAtEndpointMm(wall, end, walls);
  const fallbackStart = (): { innerAlong: number; outerAlong: number } =>
    end === "start"
      ? { innerAlong: 0, outerAlong: -bonus }
      : { innerAlong: L, outerAlong: L + bonus };

  const j = findWallJointAtEnd(wall.id, end, joints);
  if (!j) {
    return fallbackStart();
  }

  if (j.kind === "CORNER_BUTT") {
    const wa = walls.find((w) => w.id === j.wallAId);
    const wb = walls.find((w) => w.id === j.wallBId);
    if (!wa || !wb) {
      return fallbackStart();
    }
    const corners = cornerInnerOuterCornersMm(wa, wb, centroid);
    if (!corners) {
      return fallbackStart();
    }
    return {
      innerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.inner),
      outerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.outer),
    };
  }

  if (j.kind === "CORNER_MITER") {
    const wa = walls.find((w) => w.id === j.wallAId);
    const wb = walls.find((w) => w.id === j.wallBId);
    const wbEnd = j.wallBEnd;
    if (!wa || !wb || wbEnd == null) {
      return fallbackStart();
    }
    const corners = miterCornerInnerOuterPlanMm(wa, j.wallAEnd, wb, wbEnd);
    if (!corners) {
      return fallbackStart();
    }
    return {
      innerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.inner),
      outerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.outer),
    };
  }

  if (j.kind === "T_ABUTMENT" && j.wallAId === wall.id && j.wallAEnd === end && j.teePointOnMainMm) {
    const main = walls.find((w) => w.id === j.wallBId);
    const abutting = walls.find((w) => w.id === j.wallAId);
    if (!main || !abutting) {
      return fallbackStart();
    }
    const corners = teeInnerOuterCornersMm(main, abutting, centroid);
    if (!corners) {
      return fallbackStart();
    }
    return {
      innerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.inner),
      outerAlong: distanceAlongWallAxisFromStartUnclampedMm(wall, corners.outer),
    };
  }

  return fallbackStart();
}

/**
 * Опоры для инструмента «Переместить» на 2D-плане: внутренний/наружный контур угла дома
 * по фактическим угловым/T-стыкам из {@link WallJoint}, иначе — прежняя эвристика по торцам оси.
 *
 * Вдоль оси текущей стены: зазор до внутреннего угла и до наружного (разница задаётся геометрией стыка).
 */
export interface OpeningMovePlanAnchorsMm {
  readonly wallLengthMm: number;
  readonly modelLeftEdgeMm: number;
  readonly openingWidthMm: number;
  readonly innerLeftGapMm: number;
  readonly innerRightGapMm: number;
  readonly outerLeftGapMm: number;
  readonly outerRightGapMm: number;
  /** outerLeftGapMm − innerLeftGapMm (= innerLeftRefAlongMm − outerLeftRefAlongMm), мм. */
  readonly thicknessBonusStartMm: number;
  /** outerRightGapMm − innerRightGapMm (= outerRightRefAlongMm − innerRightRefAlongMm), мм. */
  readonly thicknessBonusEndMm: number;
  readonly innerLeftRefAlongMm: number;
  readonly outerLeftRefAlongMm: number;
  readonly innerRightRefAlongMm: number;
  readonly outerRightRefAlongMm: number;
}

export function resolveOpeningMovePlanAnchorsMm(
  wall: Wall,
  leftEdgeAlongMm: number,
  openingWidthMm: number,
  sameLayerWalls: readonly Wall[],
  sameLayerWallJoints: readonly WallJoint[],
): OpeningMovePlanAnchorsMm {
  const L = wallLengthMm(wall);
  const rightAlong = leftEdgeAlongMm + openingWidthMm;
  const centroid = planCentroidMm(sameLayerWalls);

  const startRefs = openingMoveEndReferenceAlongsMm(wall, "start", L, centroid, sameLayerWalls, sameLayerWallJoints);
  const endRefs = openingMoveEndReferenceAlongsMm(wall, "end", L, centroid, sameLayerWalls, sameLayerWallJoints);

  const innerLeftRefAlongMm = startRefs.innerAlong;
  const outerLeftRefAlongMm = startRefs.outerAlong;
  const innerRightRefAlongMm = endRefs.innerAlong;
  const outerRightRefAlongMm = endRefs.outerAlong;

  const innerLeftGapMm = leftEdgeAlongMm - innerLeftRefAlongMm;
  const outerLeftGapMm = leftEdgeAlongMm - outerLeftRefAlongMm;
  const innerRightGapMm = innerRightRefAlongMm - rightAlong;
  const outerRightGapMm = outerRightRefAlongMm - rightAlong;

  const thicknessBonusStartMm = innerLeftRefAlongMm - outerLeftRefAlongMm;
  const thicknessBonusEndMm = outerRightRefAlongMm - innerRightRefAlongMm;

  return {
    wallLengthMm: L,
    modelLeftEdgeMm: leftEdgeAlongMm,
    openingWidthMm,
    innerLeftGapMm,
    innerRightGapMm,
    outerLeftGapMm,
    outerRightGapMm,
    thicknessBonusStartMm,
    thicknessBonusEndMm,
    innerLeftRefAlongMm,
    outerLeftRefAlongMm,
    innerRightRefAlongMm,
    outerRightRefAlongMm,
  };
}
