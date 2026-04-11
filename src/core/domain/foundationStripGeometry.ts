import type { Point2D } from "../geometry/types";
import type { FoundationStripEntity, FoundationStripOrthoRingEntity, FoundationStripSegmentEntity } from "./foundationStrip";

const PARALLEL_DOT_TOL = 0.985;
const NODE_MERGE_MM = 2.5;

export function normalizeVec2(nx: number, ny: number): { nx: number; ny: number } {
  const l = Math.hypot(nx, ny);
  if (l < 1e-12) {
    return { nx: 0, ny: 1 };
  }
  return { nx: nx / l, ny: ny / l };
}

/** Четыре угла полосы в плане (мм), обход CCW: внешняя сторона → внутренняя. */
export function foundationStripSegmentFootprintQuadMm(
  axisStart: Point2D,
  axisEnd: Point2D,
  outNx: number,
  outNy: number,
  sideOutMm: number,
  sideInMm: number,
): readonly Point2D[] {
  const { nx, ny } = normalizeVec2(outNx, outNy);
  const outerA = { x: axisStart.x + nx * sideOutMm, y: axisStart.y + ny * sideOutMm };
  const outerB = { x: axisEnd.x + nx * sideOutMm, y: axisEnd.y + ny * sideOutMm };
  const innerB = { x: axisEnd.x - nx * sideInMm, y: axisEnd.y - ny * sideInMm };
  const innerA = { x: axisStart.x - nx * sideInMm, y: axisStart.y - ny * sideInMm };
  return [outerA, outerB, innerB, innerA];
}

/** Четыре осевых стороны ортогонального прямоугольника (CCW по внешнему контуру здания). */
export function foundationStripOrthoRectangleAxesMm(
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
): readonly { start: Point2D; end: Point2D; outNx: number; outNy: number }[] {
  return [
    { start: { x: xmin, y: ymin }, end: { x: xmax, y: ymin }, outNx: 0, outNy: -1 },
    { start: { x: xmax, y: ymin }, end: { x: xmax, y: ymax }, outNx: 1, outNy: 0 },
    { start: { x: xmax, y: ymax }, end: { x: xmin, y: ymax }, outNx: 0, outNy: 1 },
    { start: { x: xmin, y: ymax }, end: { x: xmin, y: ymin }, outNx: -1, outNy: 0 },
  ];
}

/**
 * Контуры кольца ленты (мм): внешний CCW, внутренний CW — для Pixi `fill` + `cut`.
 * Согласовано с четырьмя осевыми сегментами и нормалями из `foundationStripOrthoRectangleAxesMm`.
 */
export function foundationStripOrthoRingFootprintContoursMm(
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  sideOutMm: number,
  sideInMm: number,
): { readonly outer: readonly Point2D[]; readonly inner: readonly Point2D[] } {
  const oMinX = xmin - sideOutMm;
  const oMaxX = xmax + sideOutMm;
  const oMinY = ymin - sideOutMm;
  const oMaxY = ymax + sideOutMm;
  const iMinX = xmin + sideInMm;
  const iMaxX = xmax - sideInMm;
  const iMinY = ymin + sideInMm;
  const iMaxY = ymax - sideInMm;
  const outer: Point2D[] = [
    { x: oMinX, y: oMinY },
    { x: oMaxX, y: oMinY },
    { x: oMaxX, y: oMaxY },
    { x: oMinX, y: oMaxY },
  ];
  const inner: Point2D[] = [
    { x: iMinX, y: iMinY },
    { x: iMinX, y: iMaxY },
    { x: iMaxX, y: iMaxY },
    { x: iMaxX, y: iMinY },
  ];
  return { outer, inner };
}

export function foundationStripOrthoRingFootprintContoursFromEntityMm(
  e: FoundationStripOrthoRingEntity,
): { readonly outer: readonly Point2D[]; readonly inner: readonly Point2D[] } {
  return foundationStripOrthoRingFootprintContoursMm(
    e.axisXminMm,
    e.axisXmaxMm,
    e.axisYminMm,
    e.axisYmaxMm,
    e.sideOutMm,
    e.sideInMm,
  );
}

/** Bbox кольца на плане (мм) — внешний прямоугольник полосы. */
export function foundationStripOrthoRingOuterBoundsMm(e: FoundationStripOrthoRingEntity): {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
} {
  return {
    minX: e.axisXminMm - e.sideOutMm,
    maxX: e.axisXmaxMm + e.sideOutMm,
    minY: e.axisYminMm - e.sideOutMm,
    maxY: e.axisYmaxMm + e.sideOutMm,
  };
}

export interface FoundationStripOrthoRingAxisBoundsMm {
  readonly outer: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };
  readonly inner: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };
}

export function foundationStripOrthoRingAxisBoundsMm(e: FoundationStripOrthoRingEntity): FoundationStripOrthoRingAxisBoundsMm {
  return {
    outer: foundationStripOrthoRingOuterBoundsMm(e),
    inner: {
      minX: e.axisXminMm + e.sideInMm,
      maxX: e.axisXmaxMm - e.sideInMm,
      minY: e.axisYminMm + e.sideInMm,
      maxY: e.axisYmaxMm - e.sideInMm,
    },
  };
}

export function pointInFoundationStripOrthoRingMm(p: Point2D, e: FoundationStripOrthoRingEntity): boolean {
  const { outer, inner } = foundationStripOrthoRingAxisBoundsMm(e);
  if (p.x < outer.minX || p.x > outer.maxX || p.y < outer.minY || p.y > outer.maxY) {
    return false;
  }
  if (inner.maxX > inner.minX && inner.maxY > inner.minY) {
    if (p.x > inner.minX && p.x < inner.maxX && p.y > inner.minY && p.y < inner.maxY) {
      return false;
    }
  }
  return true;
}

function distPointToAxisAlignedRectBoundaryMm(
  p: Point2D,
  r: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
): number {
  const dx = p.x < r.minX ? r.minX - p.x : p.x > r.maxX ? p.x - r.maxX : 0;
  const dy = p.y < r.minY ? r.minY - p.y : p.y > r.maxY ? p.y - r.maxY : 0;
  return Math.hypot(dx, dy);
}

/** Расстояние до ближайшей точки на кольце (0 — внутри полосы включая границы). */
export function distanceToFoundationStripOrthoRingMm(p: Point2D, e: FoundationStripOrthoRingEntity): number {
  if (pointInFoundationStripOrthoRingMm(p, e)) {
    return 0;
  }
  const { outer, inner } = foundationStripOrthoRingAxisBoundsMm(e);
  const dout = distPointToAxisAlignedRectBoundaryMm(p, outer);
  if (dout > 1e-6) {
    return dout;
  }
  if (inner.maxX <= inner.minX || inner.maxY <= inner.minY) {
    return 0;
  }
  if (p.x > inner.minX && p.x < inner.maxX && p.y > inner.minY && p.y < inner.maxY) {
    const dLeft = p.x - inner.minX;
    const dRight = inner.maxX - p.x;
    const dBottom = p.y - inner.minY;
    const dTop = inner.maxY - p.y;
    return Math.min(dLeft, dRight, dBottom, dTop);
  }
  return 0;
}

/** Одна сущность замкнутой ортогональной ленты (без четырёх перекрывающихся сегментов). */
export function buildOrthoRectangleFoundationStripRingEntity(input: {
  readonly layerId: string;
  readonly xmin: number;
  readonly xmax: number;
  readonly ymin: number;
  readonly ymax: number;
  readonly depthMm: number;
  readonly sideOutMm: number;
  readonly sideInMm: number;
  readonly createdAt: string;
  readonly newId: () => string;
}): FoundationStripOrthoRingEntity {
  return {
    kind: "ortho_ring",
    id: input.newId(),
    layerId: input.layerId,
    axisXminMm: input.xmin,
    axisXmaxMm: input.xmax,
    axisYminMm: input.ymin,
    axisYmaxMm: input.ymax,
    depthMm: input.depthMm,
    sideOutMm: input.sideOutMm,
    sideInMm: input.sideInMm,
    createdAt: input.createdAt,
  };
}

function sameSegmentParams(a: FoundationStripSegmentEntity, b: FoundationStripSegmentEntity): boolean {
  return (
    a.layerId === b.layerId &&
    a.depthMm === b.depthMm &&
    a.sideOutMm === b.sideOutMm &&
    a.sideInMm === b.sideInMm &&
    Math.abs(a.outwardNormalX * b.outwardNormalX + a.outwardNormalY * b.outwardNormalY - 1) < 1e-3
  );
}

function axisUnit(a: FoundationStripSegmentEntity): { ux: number; uy: number } | null {
  const dx = a.axisEnd.x - a.axisStart.x;
  const dy = a.axisEnd.y - a.axisStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return null;
  }
  return { ux: dx / len, uy: dy / len };
}

function distMm(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function onAxisInfinite(p: Point2D, seg: FoundationStripSegmentEntity, tol: number): boolean {
  const u = axisUnit(seg);
  if (!u) {
    return false;
  }
  const vx = p.x - seg.axisStart.x;
  const vy = p.y - seg.axisStart.y;
  const cross = Math.abs(vx * u.uy - vy * u.ux);
  return cross <= tol;
}

function canMergeCollinearStripSegments(a: FoundationStripSegmentEntity, b: FoundationStripSegmentEntity): boolean {
  if (!sameSegmentParams(a, b)) {
    return false;
  }
  const ua = axisUnit(a);
  const ub = axisUnit(b);
  if (!ua || !ub) {
    return false;
  }
  const parallel = Math.abs(ua.ux * ub.ux + ua.uy * ub.uy);
  if (parallel < PARALLEL_DOT_TOL) {
    return false;
  }
  const tol = NODE_MERGE_MM;
  const pairs = [
    [a.axisStart, b.axisStart],
    [a.axisStart, b.axisEnd],
    [a.axisEnd, b.axisStart],
    [a.axisEnd, b.axisEnd],
  ] as const;
  let touch = false;
  for (const [p, q] of pairs) {
    if (distMm(p, q) <= tol) {
      touch = true;
      break;
    }
  }
  if (!touch) {
    return false;
  }
  const pts = [a.axisStart, a.axisEnd, b.axisStart, b.axisEnd];
  for (const p of pts) {
    if (!onAxisInfinite(p, a, tol) || !onAxisInfinite(p, b, tol)) {
      return false;
    }
  }
  return true;
}

function mergedAxisEndpoints(a: FoundationStripSegmentEntity, b: FoundationStripSegmentEntity): {
  s: Point2D;
  e: Point2D;
} {
  const pts = [a.axisStart, a.axisEnd, b.axisStart, b.axisEnd];
  let bestI = 0;
  let bestJ = 1;
  let bestD = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = distMm(pts[i]!, pts[j]!);
      if (d > bestD) {
        bestD = d;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return { s: pts[bestI]!, e: pts[bestJ]! };
}

/**
 * Объединяет соседние коллинеарные сегменты с одинаковыми параметрами и общим узлом.
 * Сущности `ortho_ring` не изменяются и сохраняют порядок относительно остальных элементов.
 */
export function mergeCollinearFoundationStripSegments(entities: readonly FoundationStripEntity[]): FoundationStripEntity[] {
  let list: FoundationStripEntity[] = [...entities];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < list.length; i++) {
      const ai = list[i]!;
      if (ai.kind !== "segment") {
        continue;
      }
      for (let j = i + 1; j < list.length; j++) {
        const bj = list[j]!;
        if (bj.kind !== "segment") {
          continue;
        }
        if (!canMergeCollinearStripSegments(ai, bj)) {
          continue;
        }
        const { s, e } = mergedAxisEndpoints(ai, bj);
        const merged: FoundationStripSegmentEntity = {
          ...ai,
          id: ai.id,
          axisStart: s,
          axisEnd: e,
        };
        list = [...list.slice(0, i), ...list.slice(i + 1, j), ...list.slice(j + 1), merged];
        changed = true;
        break outer;
      }
    }
  }
  return list;
}
