import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";

import type { Point2D } from "../geometry/types";
import { newEntityId } from "./ids";
import { resolveFloorBeamCenterlineInPlan } from "./floorBeamGeometry";
import type {
  FloorInsulationPiece,
  FloorInsulationSpecSnapshot,
  FloorInsulationTemplateParams,
} from "./floorInsulation";
import type { Profile } from "./profile";
import {
  multiPolygonAreaMm2,
  multiPolygonContainsPoint,
  findPolygonContainingPoint,
  computeFreeSpaceForLayer,
  type FloorInsulationFillRegion,
} from "./floorInsulationGeometry";
import { ringMmToClosedPairs } from "./foundationStripMerge";
import { computeFloorInsulationGeometryFingerprint } from "./floorInsulationFingerprint";
import { computeLayerVerticalStack, floorBeamWorldBottomMmFromMap } from "./layerVerticalStack";
import type { Project } from "./project";

const MIN_PIECE_MM2 = 2500;
const FULL_SHEET_AREA_RATIO = 0.997;

function quantizeMm(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function pairsToLoop(ring: readonly [number, number][]): Point2D[] {
  if (ring.length < 2) {
    return ring.map(([x, y]) => ({ x, y }));
  }
  const last = ring[ring.length - 1]!;
  const first = ring[0]!;
  const dropClose = last[0] === first[0] && last[1] === first[1];
  const slice = dropClose ? ring.slice(0, -1) : ring;
  return slice.map(([x, y]) => ({ x: quantizeMm(x), y: quantizeMm(y) }));
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

function polygonAreaFromClippingPoly(poly: Polygon): number {
  const outer = poly[0];
  if (!outer) {
    return 0;
  }
  const o = pairsToLoop(outer);
  if (o.length < 3) {
    return 0;
  }
  let sum = Math.abs(signedAreaLoopMm(o));
  for (let hi = 1; hi < poly.length; hi++) {
    const h = poly[hi]!;
    const ho = pairsToLoop(h);
    if (ho.length >= 3) {
      sum -= Math.abs(signedAreaLoopMm(ho));
    }
  }
  return Math.max(0, sum);
}

function unitPerpLeft(e: Point2D): Point2D {
  const len = Math.hypot(e.x, e.y);
  if (len < 1e-9) {
    return { x: 0, y: 1 };
  }
  return { x: -e.y / len, y: e.x / len };
}

function normalize2d(v: Point2D): Point2D {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) {
    return { x: 1, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

export function meanBeamAlongDirection(project: Project, layerId: string): Point2D {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const b of project.floorBeams) {
    if (b.layerId !== layerId) {
      continue;
    }
    const cl = resolveFloorBeamCenterlineInPlan(project, b);
    if (!cl) {
      continue;
    }
    const dx = cl.centerEnd.x - cl.centerStart.x;
    const dy = cl.centerEnd.y - cl.centerStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      continue;
    }
    sx += dx / len;
    sy += dy / len;
    n++;
  }
  if (n === 0) {
    return { x: 1, y: 0 };
  }
  return normalize2d({ x: sx / n, y: sy / n });
}

function rectSheetPolygonMm(
  origin: Point2D,
  eAcross: Point2D,
  eAlong: Point2D,
  i: number,
  j: number,
  widthAcross: number,
  lengthAlong: number,
): Polygon {
  const ax = i * widthAcross;
  const ay = j * lengthAlong;
  const p00 = {
    x: origin.x + ax * eAcross.x + ay * eAlong.x,
    y: origin.y + ax * eAcross.y + ay * eAlong.y,
  };
  const p10 = {
    x: origin.x + (ax + widthAcross) * eAcross.x + ay * eAlong.x,
    y: origin.y + (ax + widthAcross) * eAcross.y + ay * eAlong.y,
  };
  const p11 = {
    x: origin.x + (ax + widthAcross) * eAcross.x + (ay + lengthAlong) * eAlong.x,
    y: origin.y + (ax + widthAcross) * eAcross.y + (ay + lengthAlong) * eAlong.y,
  };
  const p01 = {
    x: origin.x + ax * eAcross.x + (ay + lengthAlong) * eAlong.x,
    y: origin.y + ax * eAcross.y + (ay + lengthAlong) * eAlong.y,
  };
  const corners = [p00, p10, p11, p01];
  return [ringMmToClosedPairs(corners)];
}

function bboxLocalExtents(
  mp: MultiPolygon,
  origin: Point2D,
  eAcross: Point2D,
  eAlong: Point2D,
): { minA: number; maxA: number; minL: number; maxL: number } | null {
  let minA = Infinity;
  let maxA = -Infinity;
  let minL = Infinity;
  let maxL = -Infinity;
  let any = false;
  for (const poly of mp) {
    const outer = poly[0];
    if (!outer) {
      continue;
    }
    const loop = pairsToLoop(outer);
    for (const p of loop) {
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const a = dx * eAcross.x + dy * eAcross.y;
      const l = dx * eAlong.x + dy * eAlong.y;
      minA = Math.min(minA, a);
      maxA = Math.max(maxA, a);
      minL = Math.min(minL, l);
      maxL = Math.max(maxL, l);
      any = true;
    }
  }
  return any ? { minA, maxA, minL, maxL } : null;
}

function emitTilingForOrientation(
  free: MultiPolygon,
  eAlongUnit: Point2D,
  widthAcross: number,
  lengthAlong: number,
): { polys: Polygon[]; fullSheets: number; cuts: number } {
  const eAlong = eAlongUnit;
  const eAcross = unitPerpLeft(eAlong);
  const bb = bboxLocalExtents(free, { x: 0, y: 0 }, eAcross, eAlong);
  if (!bb) {
    return { polys: [], fullSheets: 0, cuts: 0 };
  }
  const origin = { x: 0, y: 0 };
  const i0 = Math.floor(bb.minA / widthAcross) - 1;
  const i1 = Math.ceil(bb.maxA / widthAcross) + 1;
  const j0 = Math.floor(bb.minL / lengthAlong) - 1;
  const j1 = Math.ceil(bb.maxL / lengthAlong) + 1;
  const polys: Polygon[] = [];
  let fullSheets = 0;
  let cuts = 0;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const rect = rectSheetPolygonMm(origin, eAcross, eAlong, i, j, widthAcross, lengthAlong);
      const inter = polygonClipping.intersection(free, [rect]);
      if (multiPolygonAreaMm2(inter) < MIN_PIECE_MM2) {
        continue;
      }
      const rectArea = polygonAreaFromClippingPoly(rect);
      for (const p of inter) {
        const a = polygonAreaFromClippingPoly(p);
        if (a < MIN_PIECE_MM2) {
          continue;
        }
        polys.push(p);
        if (a >= rectArea * FULL_SHEET_AREA_RATIO) {
          fullSheets++;
        } else {
          cuts++;
        }
      }
    }
  }
  return { polys, fullSheets, cuts };
}

export interface GenerateFloorInsulationInput {
  readonly project: Project;
  readonly layerId: string;
  readonly template: FloorInsulationTemplateParams;
  readonly profileId: string | null;
  readonly profile: Profile | null;
  /** Полная зона: плиты слоя; прямоугольник — обрезка. */
  readonly fillRegion: FloorInsulationFillRegion;
  /** Только ячейка под точкой (если задано). */
  readonly singleCellPointMm: Point2D | null;
}

function buildSpecSnapshot(
  profile: Profile | null,
  profileId: string | null,
  template: FloorInsulationTemplateParams,
): FloorInsulationSpecSnapshot {
  const fill =
    profile?.category === "insulation" && profile.insulation?.fillColorHex2d
      ? profile.insulation.fillColorHex2d
      : undefined;
  return {
    profileName: profile?.name?.trim() ? profile.name : "Утеплитель",
    profileId,
    materialLabel: template.materialLabel,
    sheetLengthMm: template.sheetLengthMm,
    sheetWidthMm: template.sheetWidthMm,
    thicknessMm: template.thicknessMm,
    technologicalGapMm: template.mountGapMm,
    layoutMode: template.layoutMode,
    fillColorHex2d: fill,
  };
}

function multiPolygonFromSinglePolygon(poly: Polygon | null): MultiPolygon | null {
  if (!poly) {
    return null;
  }
  return [poly];
}

export function generateFloorInsulationPieces(input: GenerateFloorInsulationInput): {
  readonly pieces: FloorInsulationPiece[];
  readonly errorMessage: string | null;
} {
  const { project, layerId, template, profileId, profile, fillRegion, singleCellPointMm } = input;
  let free = computeFreeSpaceForLayer(project, layerId, fillRegion);
  if (free == null || free.length === 0) {
    return { pieces: [], errorMessage: "Нет свободной области под утеплитель (плита перекрытия или область)." };
  }
  if (singleCellPointMm) {
    if (!multiPolygonContainsPoint(free, singleCellPointMm)) {
      return { pieces: [], errorMessage: "Точка вне свободной зоны между балками." };
    }
    const one = findPolygonContainingPoint(free, singleCellPointMm);
    free = multiPolygonFromSinglePolygon(one);
    if (free == null || free.length === 0) {
      return { pieces: [], errorMessage: "Не удалось выделить ячейку." };
    }
  }

  const beamU = meanBeamAlongDirection(project, layerId);
  const w = template.sheetWidthMm;
  const L = template.sheetLengthMm;
  let mode = template.layoutMode;
  if (mode === "auto") {
    const r1 = emitTilingForOrientation(free, beamU, w, L);
    const r2 = emitTilingForOrientation(free, unitPerpLeft(beamU), w, L);
    const pick1 = r1.fullSheets > r2.fullSheets || (r1.fullSheets === r2.fullSheets && r1.polys.length <= r2.polys.length);
    const emitted = pick1 ? r1 : r2;
    return buildPieces(project, layerId, template, profileId, profile, emitted.polys);
  }

  const eUnit = mode === "acrossBeams" ? unitPerpLeft(beamU) : beamU;
  const emitted = emitTilingForOrientation(free, eUnit, w, L);
  return buildPieces(project, layerId, template, profileId, profile, emitted.polys);
}

function buildPieces(
  project: Project,
  layerId: string,
  template: FloorInsulationTemplateParams,
  profileId: string | null,
  profile: Profile | null,
  polys: Polygon[],
): { pieces: FloorInsulationPiece[]; errorMessage: string | null } {
  const vMap = computeLayerVerticalStack(project);
  const beams = project.floorBeams.filter((b) => b.layerId === layerId);
  let baseMm = Infinity;
  for (const b of beams) {
    baseMm = Math.min(baseMm, floorBeamWorldBottomMmFromMap(b, vMap, project));
  }
  if (!Number.isFinite(baseMm)) {
    const slice = vMap.get(layerId);
    baseMm = slice?.computedBaseMm ?? 0;
  }
  const fp = computeFloorInsulationGeometryFingerprint(project, layerId);
  const snap = buildSpecSnapshot(profile, profileId, template);
  const t = new Date().toISOString();
  const pieces: FloorInsulationPiece[] = [];
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer) {
      continue;
    }
    const outline = pairsToLoop(outer);
    if (outline.length < 3) {
      continue;
    }
    const area = Math.abs(signedAreaLoopMm(outline));
    if (area < MIN_PIECE_MM2) {
      continue;
    }
    const rectArea = template.sheetWidthMm * template.sheetLengthMm;
    const isFull = area >= rectArea * FULL_SHEET_AREA_RATIO;
    pieces.push({
      id: newEntityId(),
      layerId,
      outlineRingMm: outline,
      thicknessMm: template.thicknessMm,
      baseElevationMm: baseMm,
      specSnapshot: snap,
      isFullSheet: isFull,
      areaMm2: area,
      volumeMm3: area * template.thicknessMm,
      geometryFingerprint: fp,
      createdAt: t,
      updatedAt: t,
    });
  }
  return { pieces, errorMessage: pieces.length === 0 ? "Не удалось разложить листы в выбранной области." : null };
}
