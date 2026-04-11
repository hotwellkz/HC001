/**
 * Режим Shift: фиксация произвольного направления второй точки, проекция курсора и snap-опор на луч.
 */

import { snapWorldToGridAlignedToOrigin } from "../domain/projectOriginPlan";
import type { Project } from "../domain/project";
import type { Wall } from "../domain/wall";
import { isOpeningPlacedOnWall } from "../domain/opening";
import { applyWallDirectionAngleSnapToPoint } from "./wallDirectionAngleSnap";
import {
  lengthFromSnappedPointForWallLengthEdit,
  movingEndpointForLengthMm,
} from "../domain/wallLengthChangeGeometry";
import type { Point2D } from "./types";
import type { ViewportTransform } from "./viewportTransform";
import { worldToScreen } from "./viewportTransform";
import {
  closestPointOnSegment,
  collectWallPlanVertexSnapCandidatesMm,
  layerIdsForSnapGeometry,
  resolveSnap2d,
  SNAP_GRID_PX,
  type SnapKind,
  type SnapSettings2d,
} from "./snap2d";

/** Порог в экранных пикселях для поиска опорной точки в режиме Shift-lock. */
export const SHIFT_LOCK_SNAP_SCREEN_PX = 14;

const ENDPOINT_EPS = 1e-5;

function screenDistancePx(a: Point2D, b: Point2D, t: ViewportTransform): number {
  const sa = worldToScreen(a.x, a.y, t);
  const sb = worldToScreen(b.x, b.y, t);
  return Math.hypot(sb.x - sa.x, sb.y - sa.y);
}

/** Углы проёма в плане (как в features/editor2d/openingPlanGeometry2d), inset=0 — внешний контур в полосе стены. */
function openingSlotCornersMm(
  wall: Wall,
  leftAlongMm: number,
  openingWidthMm: number,
  insetFromHalfThicknessMm: number,
): Point2D[] | null {
  const sx = wall.start.x;
  const sy = wall.start.y;
  const ex = wall.end.x;
  const ey = wall.end.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const ux = dx / len;
  const uy = dy / len;
  const T = wall.thicknessMm;
  const h = Math.max(0, T / 2 - insetFromHalfThicknessMm);
  const w0 = leftAlongMm;
  const w1 = leftAlongMm + openingWidthMm;
  return [
    { x: sx + ux * w0 + uy * h, y: sy + uy * w0 - ux * h },
    { x: sx + ux * w1 + uy * h, y: sy + uy * w1 - ux * h },
    { x: sx + ux * w1 - uy * h, y: sy + uy * w1 + ux * h },
    { x: sx + ux * w0 - uy * h, y: sy + uy * w0 + ux * h },
  ];
}

function collectShiftLockVertexCandidatesMm(project: Project, layerIds: ReadonlySet<string>): Point2D[] {
  const wallVerts = collectWallPlanVertexSnapCandidatesMm(project, layerIds);
  const extra: Point2D[] = [];
  for (const o of project.openings) {
    if (!isOpeningPlacedOnWall(o)) {
      continue;
    }
    const wall = project.walls.find((w) => w.id === o.wallId);
    if (!wall || !layerIds.has(wall.layerId)) {
      continue;
    }
    const q = openingSlotCornersMm(wall, o.offsetFromStartMm, o.widthMm, 0);
    if (q) {
      extra.push(...q);
    }
  }
  return [...wallVerts, ...extra];
}

export function unitDirectionOrNull(from: Point2D, to: Point2D): Point2D | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  return { x: dx / len, y: dy / len };
}

/**
 * Проекция точки на луч origin + t * u, t ≥ 0 (назад не уходим).
 */
export function projectPointOntoRayForward(origin: Point2D, unit: Point2D, point: Point2D): Point2D {
  const vx = point.x - origin.x;
  const vy = point.y - origin.y;
  let t = vx * unit.x + vy * unit.y;
  if (t < 0) {
    t = 0;
  }
  return { x: origin.x + t * unit.x, y: origin.y + t * unit.y };
}

export interface ShiftLockSnapHit {
  readonly point: Point2D;
  readonly kind: SnapKind;
}

/**
 * Опорная точка Q рядом с курсором: углы (стены + проёмы) → ребро стены → сетка (если включена).
 * Вершины ищутся всегда, независимо от snapToVertex — для UX Shift-lock.
 */
export function findShiftLockSnapHit(input: {
  readonly rawWorldMm: Point2D;
  readonly viewport: ViewportTransform;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
}): ShiftLockSnapHit | null {
  const { rawWorldMm, viewport, project, snapSettings, gridStepMm } = input;
  const raw = rawWorldMm;
  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));
  const planLines = project.planLines.filter((l) => layerIds.has(l.layerId));

  const vertices = collectShiftLockVertexCandidatesMm(project, layerIds);
  let bestVertex: { readonly point: Point2D; readonly dist: number } | null = null;
  for (const pt of vertices) {
    const d = screenDistancePx(raw, pt, viewport);
    if (d <= SHIFT_LOCK_SNAP_SCREEN_PX && (!bestVertex || d < bestVertex.dist)) {
      bestVertex = { point: { x: pt.x, y: pt.y }, dist: d };
    }
  }
  for (const pl of planLines) {
    for (const pt of [pl.start, pl.end]) {
      const d = screenDistancePx(raw, pt, viewport);
      if (d <= SHIFT_LOCK_SNAP_SCREEN_PX && (!bestVertex || d < bestVertex.dist)) {
        bestVertex = { point: { x: pt.x, y: pt.y }, dist: d };
      }
    }
  }
  if (bestVertex) {
    return { point: bestVertex.point, kind: "vertex" };
  }

  let bestEdge: { readonly point: Point2D; readonly dist: number } | null = null;
  for (const w of walls) {
    const { point: q, t } = closestPointOnSegment(raw, w.start, w.end);
    if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
      continue;
    }
    const d = screenDistancePx(raw, q, viewport);
    if (d <= SHIFT_LOCK_SNAP_SCREEN_PX && (!bestEdge || d < bestEdge.dist)) {
      bestEdge = { point: { x: q.x, y: q.y }, dist: d };
    }
  }
  for (const pl of planLines) {
    const { point: q, t } = closestPointOnSegment(raw, pl.start, pl.end);
    if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
      continue;
    }
    const d = screenDistancePx(raw, q, viewport);
    if (d <= SHIFT_LOCK_SNAP_SCREEN_PX && (!bestEdge || d < bestEdge.dist)) {
      bestEdge = { point: { x: q.x, y: q.y }, dist: d };
    }
  }
  if (bestEdge) {
    return { point: bestEdge.point, kind: "edge" };
  }

  if (snapSettings.snapToGrid && Number.isFinite(gridStepMm) && gridStepMm > 0) {
    const g = snapWorldToGridAlignedToOrigin(raw, gridStepMm, project.projectOrigin);
    const d = screenDistancePx(raw, g, viewport);
    if (d <= SNAP_GRID_PX) {
      return { point: g, kind: "grid" };
    }
  }

  return null;
}

/**
 * Направление фиксации при нажатии Shift: от опоры к текущему превью или к snap(курсор).
 */
export function computeShiftDirectionLockUnit(input: {
  readonly anchor: Point2D;
  readonly previewEnd: Point2D | null;
  readonly cursorWorldMm: Point2D;
  readonly viewport: ViewportTransform | null;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
  /** Подмена resolveSnap2d (например привязка инструмента «Стена» с режимом лево/право). */
  readonly resolveRawSnap?: (rawWorldMm: Point2D) => Point2D;
}): Point2D | null {
  const { anchor, previewEnd, cursorWorldMm, viewport, project, snapSettings, gridStepMm, resolveRawSnap } = input;
  let to = previewEnd;
  if (!to || Math.hypot(to.x - anchor.x, to.y - anchor.y) < 1e-3) {
    to = resolveRawSnap
      ? resolveRawSnap(cursorWorldMm)
      : resolveSnap2d({
          rawWorldMm: cursorWorldMm,
          viewport,
          project,
          snapSettings,
          gridStepMm,
        }).point;
  }
  return unitDirectionOrNull(anchor, to);
}

/** Поиск опорной точки Q для режима Shift-lock (по умолчанию — общий план). */
export type ShiftLockHitFinder = (input: {
  readonly rawWorldMm: Point2D;
  readonly viewport: ViewportTransform;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
}) => ShiftLockSnapHit | null;

export interface LinearSecondPointPreviewInput {
  readonly anchor: Point2D;
  readonly rawWorldMm: Point2D;
  readonly viewport: ViewportTransform | null;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
  /** Ненулевой единичный вектор направления, пока зажат Shift после фиксации. */
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly angleSnapLockedDeg: number | null;
  readonly skipAngleSnap: boolean;
  readonly altKey?: boolean;
  /** Иначе {@link findShiftLockSnapHit}. */
  readonly shiftLockFindHit?: ShiftLockHitFinder;
}

export interface LinearSecondPointPreviewResult {
  readonly previewEnd: Point2D;
  readonly lastSnapKind: SnapKind;
  readonly angleSnapLockedDeg: number | null;
  readonly shiftLockReferenceMm: Point2D | null;
}

/**
 * Единая цепочка: обычный snap + при необходимости привязка к 45°/90°; при Shift-lock — проекция на луч.
 */
export function computeLinearSecondPointPreview(input: LinearSecondPointPreviewInput): LinearSecondPointPreviewResult {
  const {
    anchor,
    rawWorldMm,
    viewport,
    project,
    snapSettings,
    gridStepMm,
    shiftDirectionLockUnit,
    angleSnapLockedDeg,
    skipAngleSnap,
    altKey,
  } = input;

  if (altKey) {
    const snap = resolveSnap2d({ rawWorldMm, viewport, project, snapSettings, gridStepMm });
    return {
      previewEnd: snap.point,
      lastSnapKind: snap.kind,
      angleSnapLockedDeg: null,
      shiftLockReferenceMm: null,
    };
  }

  if (shiftDirectionLockUnit && viewport) {
    const finder = input.shiftLockFindHit ?? findShiftLockSnapHit;
    const hit = finder({
      rawWorldMm,
      viewport,
      project,
      snapSettings,
      gridStepMm,
    });
    const source = hit?.point ?? rawWorldMm;
    const projected = projectPointOntoRayForward(anchor, shiftDirectionLockUnit, source);
    return {
      previewEnd: projected,
      lastSnapKind: hit ? hit.kind : "none",
      angleSnapLockedDeg,
      shiftLockReferenceMm: hit ? hit.point : null,
    };
  }

  const snap = resolveSnap2d({ rawWorldMm, viewport, project, snapSettings, gridStepMm });
  let previewEnd = snap.point;
  let nextAngleLocked = angleSnapLockedDeg;
  if (!skipAngleSnap) {
    const r = applyWallDirectionAngleSnapToPoint(anchor, previewEnd, nextAngleLocked, {});
    previewEnd = r.point;
    nextAngleLocked = r.nextLockedDeg;
  } else {
    nextAngleLocked = null;
  }
  return {
    previewEnd,
    lastSnapKind: snap.kind,
    angleSnapLockedDeg: nextAngleLocked,
    shiftLockReferenceMm: null,
  };
}

/**
 * Превью инструмента «Изменение длины»: без Shift — обычный resolveSnap2d + проекция на ось;
 * при Shift-lock — {@link findShiftLockSnapHit} + проекция опорной точки / сырого курсора на ось стены.
 */
export function computeLengthChangePreviewAlongAxis(input: {
  readonly fixedEndMm: Point2D;
  readonly axisUx: number;
  readonly axisUy: number;
  readonly rawWorldMm: Point2D;
  readonly viewport: ViewportTransform | null;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly minLenMm: number;
  readonly altKey?: boolean;
}): {
  readonly previewMovingMm: Point2D;
  readonly lastSnapKind: SnapKind;
  readonly shiftLockReferenceMm: Point2D | null;
} {
  const {
    fixedEndMm,
    axisUx,
    axisUy,
    rawWorldMm,
    viewport,
    project,
    snapSettings,
    gridStepMm,
    shiftDirectionLockUnit,
    minLenMm,
    altKey,
  } = input;

  if (altKey || !shiftDirectionLockUnit || !viewport) {
    const snap = resolveSnap2d({ rawWorldMm, viewport, project, snapSettings, gridStepMm });
    const Lmm = lengthFromSnappedPointForWallLengthEdit(
      fixedEndMm,
      axisUx,
      axisUy,
      snap.point,
      minLenMm,
    );
    return {
      previewMovingMm: movingEndpointForLengthMm(fixedEndMm, axisUx, axisUy, Lmm),
      lastSnapKind: snap.kind,
      shiftLockReferenceMm: null,
    };
  }

  const hit = findShiftLockSnapHit({ rawWorldMm, viewport, project, snapSettings, gridStepMm });
  const source = hit?.point ?? rawWorldMm;
  const Lmm = lengthFromSnappedPointForWallLengthEdit(fixedEndMm, axisUx, axisUy, source, minLenMm);
  return {
    previewMovingMm: movingEndpointForLengthMm(fixedEndMm, axisUx, axisUy, Lmm),
    lastSnapKind: hit ? hit.kind : "none",
    shiftLockReferenceMm: hit ? hit.point : null,
  };
}
