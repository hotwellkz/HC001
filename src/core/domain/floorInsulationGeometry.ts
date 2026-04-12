import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";

import type { Point2D } from "../geometry/types";
import { floorBeamPlanQuadCornersMm } from "./floorBeamGeometry";
import type { FloorBeamEntity } from "./floorBeam";
import type { Project } from "./project";
import { ringMmToClosedPairs } from "./foundationStripMerge";

function quantizeMm(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function pairsToOuterLoop(ring: readonly [number, number][]): Point2D[] {
  if (ring.length < 2) {
    return ring.map(([x, y]) => ({ x, y }));
  }
  const last = ring[ring.length - 1]!;
  const first = ring[0]!;
  const dropClose = last[0] === first[0] && last[1] === first[1];
  const slice = dropClose ? ring.slice(0, -1) : ring;
  return slice.map(([x, y]) => ({ x: quantizeMm(x), y: quantizeMm(y) }));
}

export function multiPolygonIsEmpty(mp: MultiPolygon): boolean {
  return mp.length === 0;
}

function signedAreaLoopMm(loop: readonly Point2D[]): number {
  let a = 0;
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const p0 = loop[i]!;
    const p1 = loop[(i + 1) % n]!;
    a += p0.x * p1.y - p1.x * p0.y;
  }
  return a / 2;
}

/** Площадь мультиполигона (мм²). */
export function multiPolygonAreaMm2(mp: MultiPolygon): number {
  let sum = 0;
  for (const poly of mp) {
    const outer = poly[0];
    if (!outer) {
      continue;
    }
    const o = pairsToOuterLoop(outer);
    if (o.length < 3) {
      continue;
    }
    sum += Math.abs(signedAreaLoopMm(o));
    for (let hi = 1; hi < poly.length; hi++) {
      const h = poly[hi]!;
      const ho = pairsToOuterLoop(h);
      if (ho.length >= 3) {
        sum -= Math.abs(signedAreaLoopMm(ho));
      }
    }
  }
  return Math.max(0, sum);
}

function pointInPolygonRayCastMm(p: Point2D, poly: readonly Point2D[]): boolean {
  const n = poly.length;
  if (n < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-30) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygonWithHolesMm(p: Point2D, poly: Polygon): boolean {
  const outer = poly[0];
  if (!outer) {
    return false;
  }
  const o = pairsToOuterLoop(outer);
  if (!pointInPolygonRayCastMm(p, o)) {
    return false;
  }
  for (let hi = 1; hi < poly.length; hi++) {
    const h = poly[hi]!;
    const ho = pairsToOuterLoop(h);
    if (ho.length >= 3 && pointInPolygonRayCastMm(p, ho)) {
      return false;
    }
  }
  return true;
}

export function multiPolygonContainsPoint(mp: MultiPolygon, p: Point2D): boolean {
  for (const poly of mp) {
    if (pointInPolygonWithHolesMm(p, poly)) {
      return true;
    }
  }
  return false;
}

/**
 * Возвращает один полигон из мультиполигона, содержащий точку (или null).
 */
export function findPolygonContainingPoint(mp: MultiPolygon, p: Point2D): Polygon | null {
  for (const poly of mp) {
    if (pointInPolygonWithHolesMm(p, poly)) {
      return poly;
    }
  }
  return null;
}

function slabOverlapOnLayer(project: Project, layerId: string) {
  return project.slabs.filter((s) => s.layerId === layerId && s.structuralPurpose !== "foundation");
}

/** Объединение контуров плит перекрытия на слое (без фундаментных плит). */
export function computeOverlapSlabUnion(project: Project, layerId: string): MultiPolygon | null {
  const slabs = slabOverlapOnLayer(project, layerId);
  let acc: MultiPolygon | null = null;
  for (const s of slabs) {
    if (s.pointsMm.length < 3) {
      continue;
    }
    const ring = ringMmToClosedPairs(s.pointsMm);
    const poly: Polygon = [ring];
    acc = acc == null || acc.length === 0 ? [poly] : polygonClipping.union(acc, [poly]);
  }
  return acc;
}

function beamFootprintPolygon(beam: FloorBeamEntity, project: Project): Polygon | null {
  const q = floorBeamPlanQuadCornersMm(project, beam);
  if (!q || q.length < 3) {
    return null;
  }
  return [ringMmToClosedPairs(q)];
}

/** Объединение проекций балок перекрытия на план (препятствия для EPS). */
export function computeBeamObstacleUnion(project: Project, layerId: string): MultiPolygon | null {
  const beams = project.floorBeams.filter((b) => b.layerId === layerId);
  let acc: MultiPolygon | null = null;
  for (const b of beams) {
    const poly = beamFootprintPolygon(b, project);
    if (!poly) {
      continue;
    }
    acc = acc == null || acc.length === 0 ? [poly] : polygonClipping.union(acc, [poly]);
  }
  return acc;
}

/** Прямоугольник по двум углам в произвольном порядке (ось XY). */
export function rectCornersFromTwoPointsMm(a: Point2D, b: Point2D): Point2D[] {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

function rectToMultiPolygon(corners: readonly Point2D[]): MultiPolygon {
  return [[ringMmToClosedPairs(corners)]];
}

export type FloorInsulationFillRegion =
  | { readonly kind: "slabUnion" }
  | { readonly kind: "rectangle"; readonly cornersMm: readonly Point2D[] }
  /** Замкнутый контур в плане (мм), CCW или CW — для клиппинга без разницы. */
  | { readonly kind: "polygon"; readonly ringMm: readonly Point2D[] };

function polygonRingToMultiPolygon(ring: readonly Point2D[]): MultiPolygon | null {
  if (ring.length < 3) {
    return null;
  }
  return [[ringMmToClosedPairs(ring)]];
}

/**
 * Зона заполнения: объединение плит и/или прямоугольник пользователя.
 * Если плит нет — используется только прямоугольник (должен быть задан).
 */
export function computeFillMultiPolygon(project: Project, layerId: string, region: FloorInsulationFillRegion): MultiPolygon | null {
  const slabU = computeOverlapSlabUnion(project, layerId);
  if (region.kind === "rectangle") {
    const rmp = rectToMultiPolygon(region.cornersMm);
    if (slabU == null || slabU.length === 0) {
      return rmp;
    }
    return polygonClipping.intersection(slabU, rmp);
  }
  if (region.kind === "polygon") {
    const pmp = polygonRingToMultiPolygon(region.ringMm);
    if (pmp == null) {
      return null;
    }
    if (slabU == null || slabU.length === 0) {
      return pmp;
    }
    return polygonClipping.intersection(slabU, pmp);
  }
  return slabU;
}

/**
 * Свободное место под EPS: зона заполнения минус балки.
 */
export function computeFreeInsulationMultiPolygon(
  fill: MultiPolygon | null,
  obstacles: MultiPolygon | null,
): MultiPolygon | null {
  if (fill == null || fill.length === 0) {
    return null;
  }
  if (obstacles == null || obstacles.length === 0) {
    return fill;
  }
  return polygonClipping.difference(fill, obstacles);
}

export function computeFreeSpaceForLayer(
  project: Project,
  layerId: string,
  region: FloorInsulationFillRegion,
): MultiPolygon | null {
  const fill = computeFillMultiPolygon(project, layerId, region);
  if (fill == null || fill.length === 0) {
    return null;
  }
  const obs = computeBeamObstacleUnion(project, layerId);
  return computeFreeInsulationMultiPolygon(fill, obs);
}
