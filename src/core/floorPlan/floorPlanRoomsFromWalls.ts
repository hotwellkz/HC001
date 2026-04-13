/**
 * Помещения — внутренние дыры в объединении полос стен.
 * Из каждой полосы стены вычитаются проёмы (как на 2D-плане), иначе дверной
 * проём в перегородке «сшивает» соседние комнаты в одну область.
 *
 * Ось каждой стены для полосы слегка удлиняется у торцов ({@link ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM}),
 * чтобы стыки Т и микрозазоры не размыкали union — иначе две реальные комнаты дают одну «дыру».
 */

import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";

import type { Opening } from "@/core/domain/opening";
import type { Project } from "@/core/domain/project";
import { ringMmToClosedPairs } from "@/core/domain/foundationStripMerge";
import type { Wall } from "@/core/domain/wall";
import type { Point2D } from "@/core/geometry/types";
import { layerIdsForSnapGeometry } from "@/core/geometry/snap2dPrimitives";
import { openingSlotCornersMm } from "@/features/editor2d/openingPlanGeometry2d";
import { quadCornersAlongWallMm } from "@/features/editor2d/wallPlanGeometry2d";

import { polygonAreaMm2 } from "@/core/reports/viewDefinitions/foundationPlanArea";

/** Минимальная площадь жилой зоны (м² в мм²). */
const MIN_ROOM_AREA_MM2 = 250_000; // 0.25 м²
/**
 * Меньшая сторона bbox контура помещения (мм).
 * Проём окна/двери в плане — узкая полоса ~толщина стены; не комната.
 */
const MIN_ROOM_BBOX_SHORT_SIDE_MM = 520;
/** Если контур почти совпадает с проёмом (пересечение с слотом / площадь дыры). */
const OPENING_SLOT_OVERLAP_AREA_RATIO = 0.38;

/**
 * Удлинение оси стены у торцов при построении полосы в плане (мм): перекрытие микрозазоров
 * на Т-стыках и из-за округления координат. Иначе union полос может не смыкаться, и две зоны
 * сливаются в одну «дыру» в отчёте.
 */
export const ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM = 3;

export interface FloorPlanRoomLoop {
  readonly ringMm: readonly Point2D[];
  readonly areaMm2: number;
  readonly centroid: Point2D;
  readonly bbox: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
}

function pairsRingToPoints(ring: readonly [number, number][]): Point2D[] {
  if (ring.length < 2) {
    return [];
  }
  const last = ring[ring.length - 1]!;
  const first = ring[0]!;
  const dropDup = last[0] === first[0] && last[1] === first[1] ? ring.length - 1 : ring.length;
  const out: Point2D[] = [];
  for (let i = 0; i < dropDup; i++) {
    const p = ring[i]!;
    out.push({ x: p[0], y: p[1] });
  }
  return out;
}

function bboxOfRing(loop: readonly Point2D[]): FloorPlanRoomLoop["bbox"] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of loop) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function centroidOfRing(loop: readonly Point2D[]): Point2D {
  if (loop.length < 3) {
    const b = bboxOfRing(loop);
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  }
  let cx = 0;
  let cy = 0;
  let a = 0;
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p0 = loop[i]!;
    const p1 = loop[j]!;
    const cross = p0.x * p1.y - p1.x * p0.y;
    a += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    const b = bboxOfRing(loop);
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function wallCenterlineExtendedEndpointsMm(
  w: Wall,
  extendMm: number,
): { sx: number; sy: number; ex: number; ey: number } | null {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  /** Не даём торцам пересечься на очень короткой стене. */
  const maxExt = Math.max(0, len * 0.5 - 0.05);
  const ext = Math.min(extendMm, maxExt);
  const ux = dx / len;
  const uy = dy / len;
  return {
    sx: w.start.x - ux * ext,
    sy: w.start.y - uy * ext,
    ex: w.end.x + ux * ext,
    ey: w.end.y + uy * ext,
  };
}

function wallFootprintPolygon(w: Wall): Polygon | null {
  const line = wallCenterlineExtendedEndpointsMm(w, ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM);
  if (!line) {
    return null;
  }
  const t = w.thicknessMm;
  const corners = quadCornersAlongWallMm(line.sx, line.sy, line.ex, line.ey, -t / 2, t / 2);
  if (!corners) {
    return null;
  }
  return [ringMmToClosedPairs(corners)];
}

function pointInRingMm(p: Point2D, ring: readonly Point2D[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]!.x;
    const yi = ring[i]!.y;
    const xj = ring[j]!.x;
    const yj = ring[j]!.y;
    const inter = (yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) {
      inside = !inside;
    }
  }
  return inside;
}

/** Контуры слотов проёмов (окна, двери, пустые) в плане — blacklist для ложных «комнат». */
function collectOpeningSlotRingsMm(project: Project, walls: readonly Wall[]): readonly Point2D[][] {
  const wallById = new Map(walls.map((w) => [w.id, w] as const));
  const out: Point2D[][] = [];
  for (const o of project.openings) {
    if (o.wallId == null || o.offsetFromStartMm == null || o.widthMm <= 0) {
      continue;
    }
    const w = wallById.get(o.wallId);
    if (!w) {
      continue;
    }
    const corners = openingSlotCornersMm(w, o.offsetFromStartMm, o.widthMm, 1);
    if (!corners || corners.length < 3) {
      continue;
    }
    out.push([...corners]);
  }
  return out;
}

function openingSlotPolygonForWall(w: Wall, o: Opening): Polygon | null {
  if (o.wallId !== w.id || o.offsetFromStartMm == null) {
    return null;
  }
  if (o.widthMm <= 0) {
    return null;
  }
  const corners = openingSlotCornersMm(w, o.offsetFromStartMm, o.widthMm, 1);
  if (!corners) {
    return null;
  }
  return [ringMmToClosedPairs(corners)];
}

/**
 * Полоса стены минус прямоугольники проёмов (двери, окна, пустые проёмы) — как на 2D-плане.
 */
function wallFootprintMultiPolygonAfterOpenings(w: Wall, openings: readonly Opening[]): MultiPolygon | null {
  const base = wallFootprintPolygon(w);
  if (!base) {
    return null;
  }
  let mp: MultiPolygon = [base];
  for (const o of openings) {
    if (o.wallId !== w.id || o.offsetFromStartMm == null) {
      continue;
    }
    const slot = openingSlotPolygonForWall(w, o);
    if (!slot) {
      continue;
    }
    mp = polygonClipping.difference(mp, [slot]);
  }
  if (mp.length === 0) {
    return null;
  }
  return mp;
}

function multiPolygonOuterAreaMm2(mp: MultiPolygon): number {
  let s = 0;
  for (const poly of mp) {
    const outer = poly[0];
    if (outer && outer.length >= 3) {
      s += polygonAreaMm2(pairsRingToPoints(outer));
    }
  }
  return s;
}

/**
 * Если не null — контур отбрасываем; строка — причина (для диагностики).
 */
function rejectFloorPlanRoomCandidate(
  ringMm: readonly Point2D[],
  areaMm2: number,
  centroid: Point2D,
  bbox: FloorPlanRoomLoop["bbox"],
  openingSlotRings: readonly Point2D[][],
): string | null {
  if (areaMm2 < MIN_ROOM_AREA_MM2) {
    return `площадь ${(areaMm2 / 1e6).toFixed(3)} м² < мин. ${(MIN_ROOM_AREA_MM2 / 1e6).toFixed(2)} м²`;
  }
  const spanX = bbox.maxX - bbox.minX;
  const spanY = bbox.maxY - bbox.minY;
  const shortSide = Math.min(spanX, spanY);
  const longSide = Math.max(spanX, spanY);
  if (shortSide < MIN_ROOM_BBOX_SHORT_SIDE_MM) {
    return `узкий bbox (короткая сторона ${shortSide.toFixed(0)} мм < ${MIN_ROOM_BBOX_SHORT_SIDE_MM} мм)`;
  }
  /** Вытянутый узкий силуэт без комнатных пропорций (остаток в толще стены). */
  if (longSide > shortSide * 14 && shortSide < 900) {
    return "вытянутый узкий контур (похоже на артефакт толщины стены)";
  }

  for (const slot of openingSlotRings) {
    if (pointInRingMm(centroid, slot)) {
      return "центроид внутри полигона слота проёма";
    }
    if (slot.length < 3) {
      continue;
    }
    const holePoly: Polygon = [ringMmToClosedPairs(ringMm)];
    const slotPoly: Polygon = [ringMmToClosedPairs(slot)];
    let inter: MultiPolygon;
    try {
      inter = polygonClipping.intersection(holePoly, slotPoly);
    } catch {
      continue;
    }
    const interA = multiPolygonOuterAreaMm2(inter);
    if (areaMm2 > 1e-6 && interA / areaMm2 >= OPENING_SLOT_OVERLAP_AREA_RATIO) {
      return `пересечение с слотом проёма ≥ ${Math.round(OPENING_SLOT_OVERLAP_AREA_RATIO * 100)}% площади`;
    }
  }

  return null;
}

function buildWallUnionMultiPolygon(project: Project, walls: readonly Wall[]): MultiPolygon | null {
  const wallIds = new Set(walls.map((w) => w.id));
  const openings = project.openings.filter((o) => o.wallId != null && wallIds.has(o.wallId!));

  let acc: MultiPolygon | null = null;
  for (const w of walls) {
    const wallOpenings = openings.filter((o) => o.wallId === w.id);
    const mp = wallFootprintMultiPolygonAfterOpenings(w, wallOpenings);
    if (!mp || mp.length === 0) {
      continue;
    }
    acc = acc == null || acc.length === 0 ? mp : polygonClipping.union(acc, mp);
  }
  return acc;
}

/**
 * Список замкнутых контуров помещений (внутренние дыры после union стен с учётом проёмов).
 */
export function computeFloorPlanRoomLoops(project: Project, walls: readonly Wall[]): FloorPlanRoomLoop[] {
  if (walls.length === 0) {
    return [];
  }
  const openingSlotRings = collectOpeningSlotRingsMm(project, walls);

  const acc = buildWallUnionMultiPolygon(project, walls);
  if (acc == null || acc.length === 0) {
    return [];
  }

  const rooms: FloorPlanRoomLoop[] = [];
  for (const poly of acc) {
    for (let hi = 1; hi < poly.length; hi++) {
      const holeRing = poly[hi]!;
      if (!holeRing || holeRing.length < 3) {
        continue;
      }
      const ringMm = pairsRingToPoints(holeRing);
      if (ringMm.length < 3) {
        continue;
      }
      const areaMm2 = polygonAreaMm2(ringMm);
      const centroid = centroidOfRing(ringMm);
      const bbox = bboxOfRing(ringMm);
      if (rejectFloorPlanRoomCandidate(ringMm, areaMm2, centroid, bbox, openingSlotRings) != null) {
        continue;
      }
      rooms.push({ ringMm, areaMm2, centroid, bbox });
    }
  }

  rooms.sort((a, b) => {
    if (Math.abs(b.centroid.y - a.centroid.y) > 1e-3) {
      return b.centroid.y - a.centroid.y;
    }
    return a.centroid.x - b.centroid.x;
  });

  return rooms;
}

/** Диагностика room detection для отладки (слои, стены, отвергнутые дыры). */
export interface FloorPlanRoomDetectionDiagnostics {
  readonly layerIdsUsed: readonly string[];
  readonly wallIdsIncluded: readonly string[];
  readonly wallIdsExcludedByLayer: readonly string[];
  readonly axisExtendMm: number;
  readonly wallsEmptyAfterOpenings: readonly string[];
  readonly unionPolygonCount: number;
  readonly rawHoleRingCount: number;
  readonly acceptedRoomCount: number;
  readonly rejectedHoles: readonly { readonly areaMm2: number; readonly reason: string }[];
}

/**
 * Сводка по определению помещений: какие стены учтены, какие отфильтрованы слоями,
 * какие контуры дыр отброшены эвристиками (ложные проёмы и т.д.).
 */
export function diagnoseFloorPlanRoomDetection(project: Project): FloorPlanRoomDetectionDiagnostics {
  const layerIdsUsed = [...layerIdsForSnapGeometry(project)];
  const layerSet = new Set(layerIdsUsed);
  const wallIdsIncluded: string[] = [];
  const wallIdsExcludedByLayer: string[] = [];
  for (const w of project.walls) {
    if (layerSet.has(w.layerId)) {
      wallIdsIncluded.push(w.id);
    } else {
      wallIdsExcludedByLayer.push(w.id);
    }
  }

  const walls = project.walls.filter((w) => layerSet.has(w.layerId));
  const wallIds = new Set(walls.map((w) => w.id));
  const openings = project.openings.filter((o) => o.wallId != null && wallIds.has(o.wallId!));

  const wallsEmptyAfterOpenings: string[] = [];
  for (const w of walls) {
    const wallOpenings = openings.filter((o) => o.wallId === w.id);
    const mp = wallFootprintMultiPolygonAfterOpenings(w, wallOpenings);
    if (!mp || mp.length === 0) {
      wallsEmptyAfterOpenings.push(w.id);
    }
  }

  const acc = buildWallUnionMultiPolygon(project, walls);
  const openingSlotRings = collectOpeningSlotRingsMm(project, walls);

  let rawHoleRingCount = 0;
  let acceptedRoomCount = 0;
  const rejectedHoles: { areaMm2: number; reason: string }[] = [];
  if (acc != null) {
    for (const poly of acc) {
      for (let hi = 1; hi < poly.length; hi++) {
        const holeRing = poly[hi]!;
        if (!holeRing || holeRing.length < 3) {
          continue;
        }
        rawHoleRingCount += 1;
        const ringMm = pairsRingToPoints(holeRing);
        if (ringMm.length < 3) {
          rejectedHoles.push({ areaMm2: 0, reason: "некорректное кольцо (< 3 точек)" });
          continue;
        }
        const areaMm2 = polygonAreaMm2(ringMm);
        const centroid = centroidOfRing(ringMm);
        const bbox = bboxOfRing(ringMm);
        const reason = rejectFloorPlanRoomCandidate(ringMm, areaMm2, centroid, bbox, openingSlotRings);
        if (reason != null) {
          rejectedHoles.push({ areaMm2, reason });
        } else {
          acceptedRoomCount += 1;
        }
      }
    }
  }

  return {
    layerIdsUsed,
    wallIdsIncluded,
    wallIdsExcludedByLayer,
    axisExtendMm: ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM,
    wallsEmptyAfterOpenings,
    unionPolygonCount: acc?.length ?? 0,
    rawHoleRingCount,
    acceptedRoomCount,
    rejectedHoles,
  };
}

const DIAG_CONSOLE_MAX_REJECTED = 24;

/** Многострочный текст для консоли или сообщения отчёта (вкл. debug в UI). */
export function formatFloorPlanRoomDetectionForConsole(d: FloorPlanRoomDetectionDiagnostics): string {
  const lines: string[] = [
    `[Помещения плана] слоёв в геометрии: ${d.layerIdsUsed.length}, стен учтено: ${d.wallIdsIncluded.length}, исключено слоем: ${d.wallIdsExcludedByLayer.length}`,
    `удлинение оси полосы стены: ${d.axisExtendMm} мм (стыки Т / зазоры)`,
    `union: ${d.unionPolygonCount} полигон(ов), дыр в контуре: ${d.rawHoleRingCount}, помещений после фильтра: ${d.acceptedRoomCount}`,
  ];
  if (d.wallsEmptyAfterOpenings.length > 0) {
    lines.push(
      `внимание: после вычитания проёмов полоса исчезла (id стен): ${d.wallsEmptyAfterOpenings.join(", ")}`,
    );
  }
  if (d.rejectedHoles.length > 0) {
    lines.push("отброшенные дыры (не считаются комнатами):");
    for (const r of d.rejectedHoles.slice(0, DIAG_CONSOLE_MAX_REJECTED)) {
      lines.push(`  • ${(r.areaMm2 / 1e6).toFixed(2)} м² — ${r.reason}`);
    }
    if (d.rejectedHoles.length > DIAG_CONSOLE_MAX_REJECTED) {
      lines.push(`  … ещё ${d.rejectedHoles.length - DIAG_CONSOLE_MAX_REJECTED}`);
    }
  }
  return lines.join("\n");
}
