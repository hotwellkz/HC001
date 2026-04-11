import polygonClipping, { type MultiPolygon, type Pair, type Polygon } from "polygon-clipping";

import type {
  FoundationStripEntity,
  FoundationStripFootprintPolyEntity,
  FoundationStripOrthoRingEntity,
} from "./foundationStrip";
import {
  foundationStripOrthoRingFootprintContoursFromEntityMm,
  foundationStripSegmentFootprintQuadMm,
  distanceToFoundationStripOrthoRingMm,
  pointInFoundationStripOrthoRingMm,
} from "./foundationStripGeometry";
import type { Point2D } from "../geometry/types";
import { closestPointOnSegment } from "../geometry/snap2d";

/** Допуск стыка/зазора (мм): как у mergeCollinear узлов. */
export const FOUNDATION_STRIP_MERGE_SLACK_MM = 2.5;

const AXIS_ALIGN_TOL_MM = 0.75;
const RECT_ORTH_TOL_MM = 2;

function quantizeMm(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function toPair(p: Point2D): Pair {
  return [quantizeMm(p.x), quantizeMm(p.y)];
}

/** Замкнутое кольцо для polygon-clipping (первая точка дублируется в конце). */
export function ringMmToClosedPairs(loop: readonly Point2D[]): Pair[] {
  if (loop.length < 3) {
    return loop.map(toPair);
  }
  const out: Pair[] = loop.map(toPair);
  const a = out[0]!;
  const b = out[out.length - 1]!;
  if (a[0] !== b[0] || a[1] !== b[1]) {
    out.push([a[0], a[1]]);
  }
  return out;
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

/** Внешнее CCW, отверстия CW. */
export function normalizeFootprintRingsWindingMm(
  outer: Point2D[],
  holes: Point2D[][],
): { outer: Point2D[]; holes: Point2D[][] } {
  const o = [...outer];
  if (signedAreaLoopMm(o) < 0) {
    o.reverse();
  }
  const hs = holes.map((h) => {
    const c = [...h];
    if (signedAreaLoopMm(c) > 0) {
      c.reverse();
    }
    return c;
  });
  return { outer: o, holes: hs };
}

function pointInConvexQuad(p: Point2D, quad: readonly Point2D[]): boolean {
  if (quad.length < 3) {
    return false;
  }
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i]!;
    const b = quad[(i + 1) % quad.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = s;
    } else if (s !== sign) {
      return false;
    }
  }
  return sign !== 0;
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
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-18) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInFootprintPolyEntityMm(p: Point2D, e: FoundationStripFootprintPolyEntity): boolean {
  if (!pointInPolygonRayCastMm(p, e.outerRingMm)) {
    return false;
  }
  for (const h of e.holeRingsMm) {
    if (pointInPolygonRayCastMm(p, h)) {
      return false;
    }
  }
  return true;
}

/** Точка внутри тела ленты (включая границу) для любого вида сущности. */
export function pointInFoundationStripEntityMm(p: Point2D, e: FoundationStripEntity): boolean {
  if (e.kind === "segment") {
    const quad = foundationStripSegmentFootprintQuadMm(
      e.axisStart,
      e.axisEnd,
      e.outwardNormalX,
      e.outwardNormalY,
      e.sideOutMm,
      e.sideInMm,
    );
    return pointInPolygonRayCastMm(p, quad);
  }
  if (e.kind === "ortho_ring") {
    return pointInFoundationStripOrthoRingMm(p, e);
  }
  return pointInFootprintPolyEntityMm(p, e);
}

function minDistPointToPolygonBoundaryMm(p: Point2D, poly: readonly Point2D[]): number {
  let best = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const { point: q } = closestPointOnSegment(p, a, b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best) {
      best = d;
    }
  }
  return best;
}

function distPointToFootprintPolyBoundaryMm(p: Point2D, e: FoundationStripFootprintPolyEntity): number {
  let d = minDistPointToPolygonBoundaryMm(p, e.outerRingMm);
  for (const h of e.holeRingsMm) {
    d = Math.min(d, minDistPointToPolygonBoundaryMm(p, h));
  }
  return d;
}

/** Расстояние до заполненной области ленты (0 — внутри монолита, включая границу). */
export function distanceToFoundationStripFootprintPolyMm(p: Point2D, e: FoundationStripFootprintPolyEntity): number {
  if (pointInFootprintPolyEntityMm(p, e)) {
    return 0;
  }
  if (!pointInPolygonRayCastMm(p, e.outerRingMm)) {
    return minDistPointToPolygonBoundaryMm(p, e.outerRingMm);
  }
  let d = Infinity;
  for (const h of e.holeRingsMm) {
    d = Math.min(d, minDistPointToPolygonBoundaryMm(p, h));
  }
  return d;
}

function distPointToFilledFootprintMm(p: Point2D, e: FoundationStripEntity): number {
  if (e.kind === "segment") {
    const q = foundationStripSegmentFootprintQuadMm(
      e.axisStart,
      e.axisEnd,
      e.outwardNormalX,
      e.outwardNormalY,
      e.sideOutMm,
      e.sideInMm,
    );
    return pointInConvexQuad(p, q) ? 0 : minDistPointToPolygonBoundaryMm(p, q);
  }
  if (e.kind === "ortho_ring") {
    if (pointInFoundationStripOrthoRingMm(p, e)) {
      return 0;
    }
    return distanceToFoundationStripOrthoRingMm(p, e);
  }
  if (pointInFootprintPolyEntityMm(p, e)) {
    return 0;
  }
  return distPointToFootprintPolyBoundaryMm(p, e);
}

function allBoundaryLoopsMm(e: FoundationStripEntity): readonly Point2D[][] {
  if (e.kind === "segment") {
    return [
      [...foundationStripSegmentFootprintQuadMm(e.axisStart, e.axisEnd, e.outwardNormalX, e.outwardNormalY, e.sideOutMm, e.sideInMm)],
    ];
  }
  if (e.kind === "ortho_ring") {
    const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(e);
    return [outer.map((p) => ({ ...p })), inner.map((p) => ({ ...p }))];
  }
  return [e.outerRingMm.map((p) => ({ ...p })), ...e.holeRingsMm.map((h) => h.map((p) => ({ ...p })))];
}

function minDistBetweenEntityFootprintsMm(a: FoundationStripEntity, b: FoundationStripEntity): number {
  let d = Infinity;
  for (const loop of allBoundaryLoopsMm(a)) {
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i]!;
      d = Math.min(d, distPointToFilledFootprintMm(p, b));
      const j = (i + 1) % loop.length;
      const q = loop[j]!;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      d = Math.min(d, distPointToFilledFootprintMm(mid, b));
    }
  }
  for (const loop of allBoundaryLoopsMm(b)) {
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i]!;
      d = Math.min(d, distPointToFilledFootprintMm(p, a));
      const j = (i + 1) % loop.length;
      const q = loop[j]!;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      d = Math.min(d, distPointToFilledFootprintMm(mid, a));
    }
  }
  return d;
}

function filledPolygonFromEntity(e: FoundationStripEntity): Polygon {
  if (e.kind === "segment") {
    const q = foundationStripSegmentFootprintQuadMm(
      e.axisStart,
      e.axisEnd,
      e.outwardNormalX,
      e.outwardNormalY,
      e.sideOutMm,
      e.sideInMm,
    );
    return [ringMmToClosedPairs(q)];
  }
  if (e.kind === "ortho_ring") {
    const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(e);
    return [ringMmToClosedPairs(outer), ringMmToClosedPairs(inner)];
  }
  return [ringMmToClosedPairs(e.outerRingMm), ...e.holeRingsMm.map((h) => ringMmToClosedPairs(h))];
}

function multiPolyIsEmpty(mp: MultiPolygon): boolean {
  return mp.length === 0;
}

function shouldMergePairMm(a: FoundationStripEntity, b: FoundationStripEntity, slackMm: number): boolean {
  const inter = polygonClipping.intersection(filledPolygonFromEntity(a), filledPolygonFromEntity(b));
  if (!multiPolyIsEmpty(inter)) {
    return true;
  }
  return minDistBetweenEntityFootprintsMm(a, b) <= slackMm + 1e-9;
}

/** Группировка только по слою: слияние по фактическому пересечению/касанию контуров, не по параметрам ширины/глубины. */
function compatKey(e: FoundationStripEntity): string {
  return e.layerId;
}

class UnionFind {
  private readonly p: number[];
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.p[i] !== i) {
      this.p[i] = this.find(this.p[i]!);
    }
    return this.p[i]!;
  }
  union(i: number, j: number): void {
    const ri = this.find(i);
    const rj = this.find(j);
    if (ri !== rj) {
      this.p[ri] = rj;
    }
  }
}

function pairsToLoop(ring: Pair[]): Point2D[] {
  if (ring.length < 2) {
    return ring.map(([x, y]) => ({ x, y }));
  }
  const last = ring[ring.length - 1]!;
  const first = ring[0]!;
  const dropClose = last[0] === first[0] && last[1] === first[1];
  const slice = dropClose ? ring.slice(0, -1) : ring;
  return slice.map(([x, y]) => ({ x: quantizeMm(x), y: quantizeMm(y) }));
}

function tryOrthoRingFromUnionPolygon(
  poly: Polygon,
  meta: Pick<FoundationStripOrthoRingEntity, "layerId" | "depthMm" | "sideOutMm" | "sideInMm"> & {
    readonly createdAt: string;
    readonly newId: () => string;
  },
): FoundationStripOrthoRingEntity | null {
  if (poly.length < 2) {
    return null;
  }
  const outer = pairsToLoop(poly[0]!);
  const inner = pairsToLoop(poly[1]!);
  if (outer.length !== 4 || inner.length !== 4) {
    return null;
  }
  const xs = outer.map((p) => p.x);
  const ys = outer.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  for (const p of outer) {
    if (
      Math.abs(p.x - minX) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.x - maxX) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.y - minY) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.y - maxY) > AXIS_ALIGN_TOL_MM
    ) {
      return null;
    }
  }
  const ixs = inner.map((p) => p.x);
  const iys = inner.map((p) => p.y);
  const iminX = Math.min(...ixs);
  const imaxX = Math.max(...ixs);
  const iminY = Math.min(...iys);
  const imaxY = Math.max(...iys);
  for (const p of inner) {
    if (
      Math.abs(p.x - iminX) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.x - imaxX) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.y - iminY) > AXIS_ALIGN_TOL_MM &&
      Math.abs(p.y - imaxY) > AXIS_ALIGN_TOL_MM
    ) {
      return null;
    }
  }
  const axisXmin = minX + meta.sideOutMm;
  const axisXmax = maxX - meta.sideOutMm;
  const axisYmin = minY + meta.sideOutMm;
  const axisYmax = maxY - meta.sideOutMm;
  if (!(axisXmax - axisXmin > RECT_ORTH_TOL_MM) || !(axisYmax - axisYmin > RECT_ORTH_TOL_MM)) {
    return null;
  }
  if (
    Math.abs(iminX - (axisXmin + meta.sideInMm)) > RECT_ORTH_TOL_MM ||
    Math.abs(imaxX - (axisXmax - meta.sideInMm)) > RECT_ORTH_TOL_MM ||
    Math.abs(iminY - (axisYmin + meta.sideInMm)) > RECT_ORTH_TOL_MM ||
    Math.abs(imaxY - (axisYmax - meta.sideInMm)) > RECT_ORTH_TOL_MM
  ) {
    return null;
  }
  return {
    kind: "ortho_ring",
    id: meta.newId(),
    layerId: meta.layerId,
    axisXminMm: quantizeMm(axisXmin),
    axisXmaxMm: quantizeMm(axisXmax),
    axisYminMm: quantizeMm(axisYmin),
    axisYmaxMm: quantizeMm(axisYmax),
    depthMm: meta.depthMm,
    sideOutMm: meta.sideOutMm,
    sideInMm: meta.sideInMm,
    createdAt: meta.createdAt,
  };
}

function mergeGroupEntities(
  group: readonly FoundationStripEntity[],
  slackMm: number,
  newId: () => string,
): FoundationStripEntity[] {
  if (group.length < 2) {
    return [...group];
  }
  const n = group.length;
  const uf = new UnionFind(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldMergePairMm(group[i]!, group[j]!, slackMm)) {
        uf.union(i, j);
      }
    }
  }
  const buckets = new Map<number, FoundationStripEntity[]>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    const arr = buckets.get(r) ?? [];
    arr.push(group[i]!);
    buckets.set(r, arr);
  }
  const out: FoundationStripEntity[] = [];
  for (const part of buckets.values()) {
    if (part.length === 1) {
      out.push(part[0]!);
      continue;
    }
    let acc: MultiPolygon | Polygon = filledPolygonFromEntity(part[0]!);
    for (let k = 1; k < part.length; k++) {
      acc = polygonClipping.union(acc, filledPolygonFromEntity(part[k]!));
    }
    const mp = acc as MultiPolygon;
    if (multiPolyIsEmpty(mp)) {
      continue;
    }
    const latest = part.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
    const mergedDepthMm = Math.max(...part.map((e) => e.depthMm));
    const meta = {
      layerId: latest.layerId,
      depthMm: mergedDepthMm,
      sideOutMm: latest.sideOutMm,
      sideInMm: latest.sideInMm,
      createdAt: latest.createdAt,
    };
    for (const poly of mp) {
      if (poly.length === 0 || poly[0]!.length < 3) {
        continue;
      }
      const ortho = tryOrthoRingFromUnionPolygon(poly, {
        ...meta,
        newId,
      });
      if (ortho) {
        out.push(ortho);
        continue;
      }
      const outerRaw = pairsToLoop(poly[0]!);
      const holesRaw = poly.slice(1).map((h) => pairsToLoop(h));
      const norm = normalizeFootprintRingsWindingMm(outerRaw, holesRaw);
      const fp: FoundationStripFootprintPolyEntity = {
        kind: "footprint_poly",
        id: newId(),
        layerId: meta.layerId,
        depthMm: meta.depthMm,
        sideOutMm: meta.sideOutMm,
        sideInMm: meta.sideInMm,
        createdAt: meta.createdAt,
        outerRingMm: norm.outer,
        holeRingsMm: norm.holes,
      };
      out.push(fp);
    }
  }
  return out;
}

/**
 * Объединяет соприкасающиеся/пересекающиеся ленты на одном слое по фактической геометрии (boolean union),
 * независимо от sideOut/sideIn/depth исходных участков. У итоговой сущности depthMm = max по группе;
 * sideOut/sideIn и createdAt — с последнего по времени участка (для свойств и эвристики ortho_ring).
 * Результат — ortho_ring, footprint_poly или сегменты вне связных компонент.
 */
export function mergeTouchingFoundationStripBands(
  entities: readonly FoundationStripEntity[],
  opts?: { readonly slackMm?: number; readonly newId: () => string },
): FoundationStripEntity[] {
  const slackMm = opts?.slackMm ?? FOUNDATION_STRIP_MERGE_SLACK_MM;
  const newId = opts?.newId;
  if (!newId) {
    throw new Error("mergeTouchingFoundationStripBands: newId is required");
  }
  const byKey = new Map<string, FoundationStripEntity[]>();
  for (const e of entities) {
    const k = compatKey(e);
    const arr = byKey.get(k) ?? [];
    arr.push(e);
    byKey.set(k, arr);
  }
  const emitted = new Set<string>();
  const out: FoundationStripEntity[] = [];
  for (const e of entities) {
    const k = compatKey(e);
    const peers = byKey.get(k)!;
    if (peers.length < 2) {
      out.push(e);
      continue;
    }
    if (emitted.has(k)) {
      continue;
    }
    emitted.add(k);
    out.push(...mergeGroupEntities(peers, slackMm, newId));
  }
  return out;
}

/**
 * Все ленты на слое, соприкасающиеся/пересекающиеся с лентой `seedStripId`
 * (та же логика, что у merge), без объединения в одну сущность.
 */
export function getConnectedFoundationStripsOnLayer(
  entities: readonly FoundationStripEntity[],
  layerId: string,
  seedStripId: string,
  slackMm: number = FOUNDATION_STRIP_MERGE_SLACK_MM,
): FoundationStripEntity[] {
  const onLayer = entities.filter((e) => e.layerId === layerId);
  const seedIdx = onLayer.findIndex((e) => e.id === seedStripId);
  if (seedIdx < 0) {
    return [];
  }
  const n = onLayer.length;
  const uf = new UnionFind(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldMergePairMm(onLayer[i]!, onLayer[j]!, slackMm)) {
        uf.union(i, j);
      }
    }
  }
  const root = uf.find(seedIdx);
  return onLayer.filter((_, i) => uf.find(i) === root);
}

export function foundationStripEntityCoversPlanPointMm(e: FoundationStripEntity, p: Point2D): boolean {
  if (e.kind === "segment") {
    const q = foundationStripSegmentFootprintQuadMm(
      e.axisStart,
      e.axisEnd,
      e.outwardNormalX,
      e.outwardNormalY,
      e.sideOutMm,
      e.sideInMm,
    );
    return pointInConvexQuad(p, q);
  }
  if (e.kind === "ortho_ring") {
    return pointInFoundationStripOrthoRingMm(p, e);
  }
  return pointInFootprintPolyEntityMm(p, e);
}

export function findFoundationStripIdContainingPlanPointMm(
  entities: readonly FoundationStripEntity[],
  p: Point2D,
): string | null {
  let hit: { id: string; area: number } | null = null;
  for (const e of entities) {
    if (!foundationStripEntityCoversPlanPointMm(e, p)) {
      continue;
    }
    let area: number;
    if (e.kind === "segment") {
      const q = foundationStripSegmentFootprintQuadMm(
        e.axisStart,
        e.axisEnd,
        e.outwardNormalX,
        e.outwardNormalY,
        e.sideOutMm,
        e.sideInMm,
      );
      area = Math.abs(signedAreaLoopMm(q));
    } else if (e.kind === "ortho_ring") {
      const { outer } = foundationStripOrthoRingFootprintContoursFromEntityMm(e);
      const oa = Math.abs(signedAreaLoopMm(outer));
      const { inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(e);
      const ia = Math.abs(signedAreaLoopMm(inner));
      area = oa - ia;
    } else {
      area = Math.abs(signedAreaLoopMm(e.outerRingMm));
      for (const h of e.holeRingsMm) {
        area -= Math.abs(signedAreaLoopMm(h));
      }
    }
    if (!hit || area < hit.area) {
      hit = { id: e.id, area };
    }
  }
  return hit?.id ?? null;
}
