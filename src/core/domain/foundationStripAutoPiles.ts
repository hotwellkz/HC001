import type { FoundationPileEntity } from "./foundationPile";
import type {
  FoundationStripAutoPilePersisted,
  FoundationStripAutoPileSettings,
  FoundationStripEntity,
  FoundationStripFootprintPolyEntity,
} from "./foundationStrip";
import {
  foundationStripMaterialCenterOffsetFromAxisMm,
  foundationStripOrthoRingMaterialCenterLoopMm,
  foundationStripSegmentMaterialCenterAxisMm,
} from "./foundationStripGeometry";
import { pointInFoundationStripEntityMm, pointInFootprintPolyEntityMm } from "./foundationStripMerge";
import type { Point2D } from "../geometry/types";

const SNAP_MM = 0.1;
const NODE_MERGE_MM = 2.5;
const COLINEAR_DOT_TOL = 0.02;
const DEDUPE_MM = 1;
/** Запас при проверке квадрата сваи внутри ленты (мм) — углы не должны выступать за контур. */
const PILE_FIT_MARGIN_MM = 1;

export function defaultFoundationStripAutoPileSettings(): FoundationStripAutoPileSettings {
  return {
    pileKind: "reinforcedConcrete",
    maxStepMm: 3000,
    depthBelowStripMm: 1000,
    placeAtCorners: true,
    placeAtJoints: true,
    centerIntermediate: true,
    replaceExistingAuto: true,
  };
}

/** Расстояния от начала сегмента до промежуточных свай (мм), без концов. */
export function interiorSpacingsAlongLengthMm(
  lengthMm: number,
  maxStepMm: number,
  centerIntermediate: boolean,
): number[] {
  if (!(lengthMm > 1e-6) || !(maxStepMm > 1e-6)) {
    return [];
  }
  const nIntervals = Math.max(1, Math.ceil(lengthMm / maxStepMm));
  if (nIntervals <= 1) {
    return [];
  }
  if (centerIntermediate) {
    const step = lengthMm / nIntervals;
    return Array.from({ length: nIntervals - 1 }, (_, i) => (i + 1) * step);
  }
  const out: number[] = [];
  let s = maxStepMm;
  while (s < lengthMm - 1e-6) {
    out.push(s);
    s += maxStepMm;
  }
  return out;
}

function snapCoord(v: number): number {
  return Math.round(v / SNAP_MM) * SNAP_MM;
}

export function snapPointKeyMm(p: Point2D): string {
  return `${snapCoord(p.x)},${snapCoord(p.y)}`;
}

function keyToPointMm(k: string): Point2D {
  const [xs, ys] = k.split(",");
  return { x: Number(xs), y: Number(ys) };
}

function distMm(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normVec(v: Point2D): Point2D {
  const l = Math.hypot(v.x, v.y);
  if (l < 1e-12) {
    return { x: 0, y: 1 };
  }
  return { x: v.x / l, y: v.y / l };
}

function dot2(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function intersectInfiniteLines(p0: Point2D, t0: Point2D, p1: Point2D, t1: Point2D): Point2D | null {
  const rxs = t0.x * t1.y - t0.y * t1.x;
  if (Math.abs(rxs) < 1e-9) {
    return null;
  }
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const u = (dx * t1.y - dy * t1.x) / rxs;
  return { x: p0.x + t0.x * u, y: p0.y + t0.y * u };
}

function inwardNormalFootprintEdgeMm(e: FoundationStripFootprintPolyEntity, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { x: 0, y: 1 };
  }
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const probe = 4;
  const plus = pointInFootprintPolyEntityMm({ x: mx + nx * probe, y: my + ny * probe }, e);
  const minus = pointInFootprintPolyEntityMm({ x: mx - nx * probe, y: my - ny * probe }, e);
  if (plus && !minus) {
    return { x: nx, y: ny };
  }
  if (minus && !plus) {
    return { x: -nx, y: -ny };
  }
  return { x: nx, y: ny };
}

function offsetClosedRingTowardInteriorMm(
  e: FoundationStripFootprintPolyEntity,
  loop: readonly Point2D[],
  distMm: number,
): Point2D[] {
  const n = loop.length;
  if (n < 3) {
    return [];
  }
  const out: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const v0 = loop[(i - 1 + n) % n]!;
    const v1 = loop[i]!;
    const v2 = loop[(i + 1) % n]!;
    const n01 = inwardNormalFootprintEdgeMm(e, v0, v1);
    const n12 = inwardNormalFootprintEdgeMm(e, v1, v2);
    const t01 = { x: v1.x - v0.x, y: v1.y - v0.y };
    const t12 = { x: v2.x - v1.x, y: v2.y - v1.y };
    const p01 = { x: v0.x + n01.x * distMm, y: v0.y + n01.y * distMm };
    const p12 = { x: v1.x + n12.x * distMm, y: v1.y + n12.y * distMm };
    const ix = intersectInfiniteLines(p01, t01, p12, t12);
    out.push(ix ?? v1);
  }
  return out;
}

/**
 * Центральные полилинии ленты (ось полосы): открытые цепочки или замкнутые кольца.
 */
export function foundationStripCenterPolylinesMm(e: FoundationStripEntity): readonly Point2D[][] {
  if (e.kind === "segment") {
    const { start, end } = foundationStripSegmentMaterialCenterAxisMm(e);
    return [[start, end]];
  }
  if (e.kind === "ortho_ring") {
    return [foundationStripOrthoRingMaterialCenterLoopMm(e)];
  }
  const axisRef = offsetClosedRingTowardInteriorMm(e, e.outerRingMm, e.sideOutMm);
  if (axisRef.length < 3) {
    return [];
  }
  const dMid = foundationStripMaterialCenterOffsetFromAxisMm(e.sideOutMm, e.sideInMm);
  const centerOuter =
    Math.abs(dMid) > 1e-9 ? offsetClosedRingTowardInteriorMm(e, axisRef, dMid) : axisRef;
  if (centerOuter.length < 3) {
    return [];
  }
  const loops: Point2D[][] = [centerOuter];
  for (const hole of e.holeRingsMm) {
    const refHole = offsetClosedRingTowardInteriorMm(e, hole, e.sideInMm);
    if (refHole.length < 3) {
      continue;
    }
    const centerHole =
      Math.abs(dMid) > 1e-9 ? offsetClosedRingTowardInteriorMm(e, refHole, dMid) : refHole;
    if (centerHole.length >= 3) {
      loops.push(centerHole);
    }
  }
  return loops;
}

interface RawEdge {
  readonly a: Point2D;
  readonly b: Point2D;
}

function collectRawEdgesFromGroup(strips: readonly FoundationStripEntity[]): RawEdge[] {
  const edges: RawEdge[] = [];
  for (const s of strips) {
    for (const loop of foundationStripCenterPolylinesMm(s)) {
      if (loop.length < 2) {
        continue;
      }
      const closed = distMm(loop[0]!, loop[loop.length - 1]!) < NODE_MERGE_MM;
      const lastIdx = closed ? loop.length - 1 : loop.length;
      for (let i = 0; i < lastIdx; i++) {
        const a = loop[i]!;
        const b = loop[(i + 1) % loop.length]!;
        if (distMm(a, b) < 1e-6) {
          continue;
        }
        edges.push({ a, b });
      }
    }
  }
  return edges;
}

function buildNeighborMap(raw: RawEdge[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const add = (u: string, v: string) => {
    if (u === v) {
      return;
    }
    if (!m.has(u)) {
      m.set(u, new Set());
    }
    if (!m.has(v)) {
      m.set(v, new Set());
    }
    m.get(u)!.add(v);
    m.get(v)!.add(u);
  };
  for (const e of raw) {
    add(snapPointKeyMm(e.a), snapPointKeyMm(e.b));
  }
  return m;
}

function buildKeyPositions(raw: RawEdge[]): Map<string, Point2D> {
  const pos = new Map<string, Point2D>();
  for (const e of raw) {
    const ka = snapPointKeyMm(e.a);
    const kb = snapPointKeyMm(e.b);
    if (!pos.has(ka)) {
      pos.set(ka, e.a);
    }
    if (!pos.has(kb)) {
      pos.set(kb, e.b);
    }
  }
  return pos;
}

/**
 * Узлы графа оси, где ставится отдельная свая «в вершине» — только по флагам.
 * Без запасного «добавить все узлы»: false у чекбокса полностью отключает правило.
 */
function computeVertexPileKeys(neighbors: Map<string, Set<string>>, settings: FoundationStripAutoPileSettings): Set<string> {
  const keys = new Set<string>();
  for (const [k, ns] of neighbors) {
    const deg = ns.size;
    if (deg >= 3) {
      if (settings.placeAtJoints) {
        keys.add(k);
      }
      continue;
    }
    if (deg === 2 && settings.placeAtCorners) {
      const nb = [...ns];
      if (nb.length !== 2) {
        continue;
      }
      const u = nb[0]!;
      const v = nb[1]!;
      const pk = keyToPointMm(k);
      const pu = keyToPointMm(u);
      const pv = keyToPointMm(v);
      const d0 = normVec({ x: pk.x - pu.x, y: pk.y - pu.y });
      const d1 = normVec({ x: pv.x - pk.x, y: pv.y - pk.y });
      if (Math.abs(dot2(d0, d1)) + COLINEAR_DOT_TOL < 1) {
        keys.add(k);
      }
    }
  }
  return keys;
}

function chainArcLengthMm(chain: readonly Point2D[]): number {
  let s = 0;
  for (let i = 0; i < chain.length - 1; i++) {
    s += distMm(chain[i]!, chain[i + 1]!);
  }
  return s;
}

function pointAlongChainMm(chain: readonly Point2D[], distFromStart: number): Point2D {
  let rem = distFromStart;
  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i]!;
    const b = chain[i + 1]!;
    const len = distMm(a, b);
    if (rem <= len + 1e-9) {
      const t = len < 1e-9 ? 0 : rem / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    rem -= len;
  }
  return chain[chain.length - 1]!;
}

function dedupePointsMm(pts: readonly Point2D[]): Point2D[] {
  const out: Point2D[] = [];
  for (const p of pts) {
    if (out.every((q) => distMm(p, q) > DEDUPE_MM)) {
      out.push(p);
    }
  }
  return out;
}

/** Квадрат сваи (ось X/Y) с припуском к границе ленты — все углы должны лежать внутри тела хотя бы одной ленты группы. */
function pileSquareCornersInsetMm(center: Point2D, sizeMm: number): Point2D[] {
  const h = Math.max(0, sizeMm / 2 - PILE_FIT_MARGIN_MM);
  if (h < 1e-9) {
    return [center];
  }
  return [
    { x: center.x - h, y: center.y - h },
    { x: center.x + h, y: center.y - h },
    { x: center.x + h, y: center.y + h },
    { x: center.x - h, y: center.y + h },
  ];
}

function pileFitsInsideFoundationStripGroupMm(
  center: Point2D,
  sizeMm: number,
  strips: readonly FoundationStripEntity[],
): boolean {
  const corners = pileSquareCornersInsetMm(center, sizeMm);
  return corners.every((c) => strips.some((s) => pointInFoundationStripEntityMm(c, s)));
}

/** Сжать подряд совпадающие ключи и (для замкнутого) убрать дубль первой/последней точки. */
function compressPolylineKeys(seq: readonly Point2D[]): { pts: Point2D[]; keys: string[]; closed: boolean } {
  if (seq.length < 2) {
    return { pts: [...seq], keys: seq.map(snapPointKeyMm), closed: false };
  }
  const closed = distMm(seq[0]!, seq[seq.length - 1]!) < NODE_MERGE_MM;
  const pts: Point2D[] = [];
  const keys: string[] = [];
  const lastIdx = closed ? seq.length - 1 : seq.length;
  for (let i = 0; i < lastIdx; i++) {
    const p = seq[i]!;
    const k = snapPointKeyMm(p);
    if (keys.length === 0 || keys[keys.length - 1] !== k) {
      pts.push(p);
      keys.push(k);
    }
  }
  if (closed && keys.length > 1 && keys[0] === keys[keys.length - 1]) {
    pts.pop();
    keys.pop();
  }
  return { pts, keys, closed: closed && keys.length >= 2 };
}

/**
 * Промежуточные сваи по шагу между соседними вершинами полилинии оси (все изломы участвуют в разбиении,
 * независимо от чекбоксов углов/стыков — те влияют только на `computeVertexPileKeys`).
 */
function interiorAlongPolyline(
  pts: readonly Point2D[],
  keys: readonly string[],
  closed: boolean,
  settings: FoundationStripAutoPileSettings,
): Point2D[] {
  const n = keys.length;
  if (n < 2) {
    return [];
  }
  const idxM = [...Array(n).keys()];
  const interiors: Point2D[] = [];

  const spanChain = (i0: number, i1: number): Point2D[] => {
    if (i0 === i1) {
      return [pts[i0]!];
    }
    if (i0 < i1) {
      return pts.slice(i0, i1 + 1);
    }
    return [...pts.slice(i0), ...pts.slice(0, i1 + 1)];
  };

  if (!closed) {
    for (let a = 0; a < idxM.length - 1; a++) {
      const chain = spanChain(idxM[a]!, idxM[a + 1]!);
      const L = chainArcLengthMm(chain);
      for (const off of interiorSpacingsAlongLengthMm(L, settings.maxStepMm, settings.centerIntermediate)) {
        interiors.push(pointAlongChainMm(chain, off));
      }
    }
    return interiors;
  }

  if (idxM.length < 2) {
    return interiors;
  }
  for (let a = 0; a < idxM.length; a++) {
    const i0 = idxM[a]!;
    const i1 = idxM[(a + 1) % idxM.length]!;
    const chain = spanChain(i0, i1);
    const L = chainArcLengthMm(chain);
    for (const off of interiorSpacingsAlongLengthMm(L, settings.maxStepMm, settings.centerIntermediate)) {
      interiors.push(pointAlongChainMm(chain, off));
    }
  }
  return interiors;
}

export interface AutoFoundationPilesResult {
  readonly pileCentersMm: readonly Point2D[];
  readonly sizeMm: number;
  readonly capSizeMm: number;
  readonly levelMm: number;
  readonly heightMm: number;
}

/**
 * Точки центров свай и геометрия ствола для связной группы лент.
 */
export function computeAutoFoundationPileLayout(
  strips: readonly FoundationStripEntity[],
  settings: FoundationStripAutoPileSettings,
): AutoFoundationPilesResult | null {
  if (strips.length === 0 || settings.pileKind !== "reinforcedConcrete") {
    return null;
  }
  const maxDepth = Math.max(...strips.map((s) => s.depthMm));
  const maxWidth = Math.max(...strips.map((s) => s.sideOutMm + s.sideInMm));
  const sizeMm = Math.min(600, Math.max(200, Math.round(maxWidth)));
  const capSizeMm = sizeMm;
  const levelMm = -maxDepth;
  const heightMm = settings.depthBelowStripMm;

  const raw = collectRawEdgesFromGroup(strips);
  if (raw.length === 0) {
    return null;
  }
  const neighbors = buildNeighborMap(raw);
  const vertexPileKeys = computeVertexPileKeys(neighbors, settings);
  const pos = buildKeyPositions(raw);

  const vertexPiles: Point2D[] = [...vertexPileKeys].map((k) => pos.get(k) ?? keyToPointMm(k));

  const interiorPiles: Point2D[] = [];
  for (const s of strips) {
    for (const loop of foundationStripCenterPolylinesMm(s)) {
      const { pts, keys, closed } = compressPolylineKeys(loop);
      if (keys.length < 2) {
        continue;
      }
      interiorPiles.push(...interiorAlongPolyline(pts, keys, closed, settings));
    }
  }

  const merged = dedupePointsMm([...vertexPiles, ...interiorPiles]);
  const pileCentersMm = merged.filter((p) => pileFitsInsideFoundationStripGroupMm(p, sizeMm, strips));
  return { pileCentersMm, sizeMm, capSizeMm, levelMm, heightMm };
}

export function buildFoundationPileEntitiesFromAutoLayout(
  layout: AutoFoundationPilesResult,
  input: { readonly layerId: string; readonly batchId: string; readonly newPileId: () => string; readonly nowIso: () => string },
): FoundationPileEntity[] {
  const t = input.nowIso();
  return layout.pileCentersMm.map((p) => ({
    id: input.newPileId(),
    layerId: input.layerId,
    pileKind: "reinforcedConcrete" as const,
    centerX: p.x,
    centerY: p.y,
    sizeMm: layout.sizeMm,
    capSizeMm: layout.capSizeMm,
    heightMm: layout.heightMm,
    levelMm: layout.levelMm,
    createdAt: t,
    updatedAt: t,
    autoPileBatchId: input.batchId,
  }));
}

export function applyAutoPilePersistToStripGroup(
  strips: readonly FoundationStripEntity[],
  groupStripIds: ReadonlySet<string>,
  autoPile: FoundationStripAutoPilePersisted,
): FoundationStripEntity[] {
  return strips.map((s) => (groupStripIds.has(s.id) ? { ...s, autoPile } : s));
}

export function removeFoundationPilesWithBatchId(
  piles: readonly FoundationPileEntity[],
  batchId: string,
): FoundationPileEntity[] {
  return piles.filter((p) => p.autoPileBatchId !== batchId);
}

/**
 * Удаляет авто-сваи на слое, чей batchId нигде не указан в `strip.autoPile.batchId`.
 * Нужен после Undo/рассинхрона: сваи остались в массиве, а ссылки на лентах уже сброшены.
 */
export function removeFoundationPilesWithUnreferencedAutoBatchOnLayer(
  piles: readonly FoundationPileEntity[],
  strips: readonly FoundationStripEntity[],
  layerId: string,
): FoundationPileEntity[] {
  const referenced = new Set<string>();
  for (const s of strips) {
    if (s.layerId === layerId && s.autoPile?.batchId) {
      referenced.add(s.autoPile.batchId);
    }
  }
  return piles.filter((p) => {
    if (p.layerId !== layerId || p.autoPileBatchId == null) {
      return true;
    }
    return referenced.has(p.autoPileBatchId);
  });
}
