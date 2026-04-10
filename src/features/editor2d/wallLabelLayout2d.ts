/**
 * Раскладка подписей на 2D-плане: общая геометрия подписей проёмов и препятствия для марок стен.
 * Марка стены ищет свободный участок вдоль оси в мм (детерминированно); подписи ОК/Д — приоритетнее.
 */

import { openingCenterOnWallMm } from "@/core/domain/openingPlacement";
import { distanceAlongWallFromStartMm, wallLengthMm } from "@/core/domain/wallCalculationGeometry";
import { closestPointOnSegment } from "@/core/domain/wallJointGeometry";
import type { Opening } from "@/core/domain/opening";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";

import { exteriorNormalForWallLabelMm } from "./wallLabelExteriorNormalMm";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

const CLEARANCE_FROM_DIM_LABEL_PX = 18;

/** Фиксированный размер шрифта подписи проёма на плане (px) — стабильность при zoom. */
export const PLAN_OPENING_LABEL_FONT_SIZE_PX = 8.5;
/** Минимальный экранный радиус «занятости» подписи проёма для анти-наложения с маркой стены. */
export const PLAN_OPENING_LABEL_SCREEN_RADIUS_MIN_PX = 38;

const ALONG_EPS_MM = 2;
/** Запрет вдоль оси с каждой стороны от границ проёма + запас под двухстрочный текст. */
const OPENING_FORBID_EXTRA_EACH_SIDE_MM = 300;
/** Дополнительный запас вдоль оси вокруг центра проёма (мм). */
const OPENING_FORBID_CENTER_PAD_MM = 90;
const CORNER_FORBID_MIN_MM = 100;
const CORNER_FORBID_MAX_MM = 380;
const CORNER_FORBID_RATIO_OF_LENGTH = 0.065;
/** Если подпись размера близко к оси стены (перпендикулярно), запрещаем участок вдоль стены. */
const DIM_INFLUENCE_PERP_MM = 720;
const DIM_FORBID_HALF_ALONG_MM = 520;

function screenDist(
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isClearOfDimLabelsScreen(
  p: { readonly x: number; readonly y: number },
  dimCenters: readonly { readonly x: number; readonly y: number }[],
  radiusPx: number,
): boolean {
  for (const d of dimCenters) {
    if (screenDist(p, d) < CLEARANCE_FROM_DIM_LABEL_PX + radiusPx * 0.35) {
      return false;
    }
  }
  return true;
}

export type PlanOpeningLabelScreenAnchor = {
  readonly mid: { readonly x: number; readonly y: number };
  /** Радиус «занятости» подписи проёма на экране, px. */
  readonly radiusPx: number;
  readonly fontSizePx: number;
};

/**
 * Подпись окна/двери: фиксированный размер шрифта и стабильный экранный радиус препятствия,
 * чтобы марка стены не «прыгала» при wheel zoom.
 */
export function computePlanOpeningLabelScreenAnchor(
  wall: Wall,
  opening: Opening,
  allWalls: readonly Wall[],
  t: ViewportTransform,
  dimCenters: readonly { readonly x: number; readonly y: number }[],
): PlanOpeningLabelScreenAnchor {
  const center = openingCenterOnWallMm(wall, opening);
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    const mid = worldToScreen(center.x, center.y, t);
    return { mid, radiusPx: PLAN_OPENING_LABEL_SCREEN_RADIUS_MIN_PX, fontSizePx: PLAN_OPENING_LABEL_FONT_SIZE_PX };
  }
  const { nx, ny } = exteriorNormalForWallLabelMm(wall, allWalls, allWalls);
  const halfT = wall.thicknessMm / 2;
  const fs = PLAN_OPENING_LABEL_FONT_SIZE_PX;
  const outsetMm = halfT + 14 / Math.max(0.01, t.zoomPixelsPerMm);

  const tryOutset = (scale: number) => {
    const oMm = outsetMm * scale;
    const bx = center.x + nx * oMm;
    const by = center.y + ny * oMm;
    const mid = worldToScreen(bx, by, t);
    const rApprox = Math.max(PLAN_OPENING_LABEL_SCREEN_RADIUS_MIN_PX, fs * 2.35);
    if (!isClearOfDimLabelsScreen(mid, dimCenters, rApprox)) {
      return null;
    }
    return { mid, rApprox };
  };

  const fallback = (() => {
    const bx = center.x + nx * outsetMm;
    const by = center.y + ny * outsetMm;
    return {
      mid: worldToScreen(bx, by, t),
      rApprox: Math.max(PLAN_OPENING_LABEL_SCREEN_RADIUS_MIN_PX, fs * 2.35),
    };
  })();

  const hit = tryOutset(1) ?? tryOutset(1.2) ?? tryOutset(1.45);
  const chosen = hit ?? fallback;
  return { mid: chosen.mid, radiusPx: chosen.rApprox, fontSizePx: fs };
}

export type WallOpeningLabelObstaclePx = {
  readonly wallId: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
};

/** Экранные круги-препятствия подписей ОК/Д на стенах (для анти-наложения с маркой стены). */
export function collectWallOpeningMarkerLabelObstaclesPx(
  project: Project,
  t: ViewportTransform,
  dimCenters: readonly { readonly x: number; readonly y: number }[],
): WallOpeningLabelObstaclePx[] {
  const out: WallOpeningLabelObstaclePx[] = [];
  const allWalls = project.walls;
  for (const o of project.openings) {
    if (o.wallId == null || o.offsetFromStartMm == null) {
      continue;
    }
    if (o.kind !== "window" && o.kind !== "door") {
      continue;
    }
    const wall = allWalls.find((w) => w.id === o.wallId);
    if (!wall) {
      continue;
    }
    const { mid, radiusPx } = computePlanOpeningLabelScreenAnchor(wall, o, allWalls, t, dimCenters);
    const r = Math.max(PLAN_OPENING_LABEL_SCREEN_RADIUS_MIN_PX, radiusPx);
    out.push({ wallId: wall.id, x: mid.x, y: mid.y, r });
  }
  return out;
}

function openingsOnWallForLabel(wall: Wall, project: Project): Opening[] {
  return project.openings.filter(
    (o) =>
      o.wallId === wall.id &&
      o.offsetFromStartMm != null &&
      (o.kind === "window" || o.kind === "door"),
  );
}

/**
 * Точка подписи стены (мм мира) держим вне компактной зоны у центра проёма,
 * чтобы не наезжать на вырез/проём на плане.
 */
export function isWallLabelWorldMmClearOfOpeningZones(
  axMm: number,
  ayMm: number,
  wall: Wall,
  project: Project,
  extraClearanceMm: number,
): boolean {
  const list = openingsOnWallForLabel(wall, project);
  for (const o of list) {
    const c = openingCenterOnWallMm(wall, o);
    const d = Math.hypot(axMm - c.x, ayMm - c.y);
    const minD = Math.max(52, o.widthMm * 0.38 + wall.thicknessMm * 0.5 + extraClearanceMm);
    if (d < minD) {
      return false;
    }
  }
  return true;
}

export function isClearOfOpeningLabelObstaclesPx(
  p: { readonly x: number; readonly y: number },
  obstacles: readonly WallOpeningLabelObstaclePx[],
  wallId: string,
  wallLabelRadiusPx: number,
  gapPx: number,
): boolean {
  for (const ob of obstacles) {
    if (ob.wallId !== wallId) {
      continue;
    }
    if (screenDist(p, { x: ob.x, y: ob.y }) < ob.r + wallLabelRadiusPx + gapPx) {
      return false;
    }
  }
  return true;
}

/** Закрытый интервал вдоль стены от start, мм. */
export type WallLabelAlongIntervalMm = { readonly lo: number; readonly hi: number };

function clipIntervalToWall(iv: WallLabelAlongIntervalMm, wallLenMm: number): WallLabelAlongIntervalMm | null {
  const L = Math.max(0, wallLenMm);
  const lo = Math.max(0, iv.lo);
  const hi = Math.min(L, iv.hi);
  if (hi <= lo + ALONG_EPS_MM) {
    return null;
  }
  return { lo, hi };
}

function cornerForbiddenHalfWidthMm(wallLenMm: number): number {
  const L = Math.max(0, wallLenMm);
  const fromRatio = L * CORNER_FORBID_RATIO_OF_LENGTH;
  return Math.min(CORNER_FORBID_MAX_MM, Math.max(CORNER_FORBID_MIN_MM, fromRatio));
}

/**
 * Запретные интервалы вдоль оси стены (мм от start): проёмы, углы, подписи размеров рядом со стеной.
 */
export function buildWallLabelForbiddenAlongIntervalsMm(
  wall: Wall,
  project: Project,
  dimLabelCentersWorldMm: readonly { readonly x: number; readonly y: number }[],
): WallLabelAlongIntervalMm[] {
  const L = wallLengthMm(wall);
  if (L < 1e-6) {
    return [];
  }
  const out: WallLabelAlongIntervalMm[] = [];
  const ch = cornerForbiddenHalfWidthMm(L);
  out.push({ lo: 0, hi: ch });
  out.push({ lo: L - ch, hi: L });

  for (const o of openingsOnWallForLabel(wall, project)) {
    const left = o.offsetFromStartMm!;
    const right = left + o.widthMm;
    const pad = OPENING_FORBID_EXTRA_EACH_SIDE_MM + OPENING_FORBID_CENTER_PAD_MM;
    const iv = clipIntervalToWall({ lo: left - pad, hi: right + pad }, L);
    if (iv) {
      out.push(iv);
    }
  }

  for (const p of dimLabelCentersWorldMm) {
    const { point: q } = closestPointOnSegment(wall.start, wall.end, p);
    const perp = Math.hypot(p.x - q.x, p.y - q.y);
    if (perp > DIM_INFLUENCE_PERP_MM) {
      continue;
    }
    const along = distanceAlongWallFromStartMm(wall, q);
    const iv = clipIntervalToWall(
      { lo: along - DIM_FORBID_HALF_ALONG_MM, hi: along + DIM_FORBID_HALF_ALONG_MM },
      L,
    );
    if (iv) {
      out.push(iv);
    }
  }

  return out;
}

/** Объединение перекрывающихся запретных интервалов. */
export function mergeWallLabelForbiddenAlongIntervalsMm(
  intervals: readonly WallLabelAlongIntervalMm[],
  wallLenMm: number,
): WallLabelAlongIntervalMm[] {
  const L = Math.max(0, wallLenMm);
  const clipped = intervals
    .map((iv) => clipIntervalToWall(iv, L))
    .filter((x): x is WallLabelAlongIntervalMm => x != null)
    .sort((a, b) => a.lo - b.lo || a.hi - b.hi);

  const merged: WallLabelAlongIntervalMm[] = [];
  for (const iv of clipped) {
    const last = merged[merged.length - 1];
    if (!last || iv.lo > last.hi + ALONG_EPS_MM) {
      merged.push({ lo: iv.lo, hi: iv.hi });
    } else {
      merged[merged.length - 1] = { lo: last.lo, hi: Math.max(last.hi, iv.hi) };
    }
  }
  return merged;
}

/** Дополнение запрещённого до [0,L] → свободные сегменты. */
export function wallLabelFreeAlongSegmentsMm(
  forbiddenMerged: readonly WallLabelAlongIntervalMm[],
  wallLenMm: number,
): WallLabelAlongIntervalMm[] {
  const L = Math.max(0, wallLenMm);
  if (L < 1e-6) {
    return [];
  }
  const free: WallLabelAlongIntervalMm[] = [];
  let x = 0;
  for (const f of forbiddenMerged) {
    if (f.lo > x + ALONG_EPS_MM) {
      free.push({ lo: x, hi: f.lo });
    }
    x = Math.max(x, f.hi);
  }
  if (L > x + ALONG_EPS_MM) {
    free.push({ lo: x, hi: L });
  }
  return free;
}

/** Ужимание сегментов на половину длины подписи вдоль стены (мм), чтобы центр марки целиком помещался. */
export function shrinkWallLabelFreeSegmentsForHalfWidthMm(
  free: readonly WallLabelAlongIntervalMm[],
  halfWidthAlongMm: number,
): WallLabelAlongIntervalMm[] {
  const hw = Math.max(0, halfWidthAlongMm);
  return free
    .map((s) => ({ lo: s.lo + hw, hi: s.hi - hw }))
    .filter((s) => s.hi > s.lo + ALONG_EPS_MM);
}

function isAlongInsideFreeSegments(alongMm: number, free: readonly WallLabelAlongIntervalMm[]): boolean {
  return free.some((s) => alongMm >= s.lo - ALONG_EPS_MM && alongMm <= s.hi + ALONG_EPS_MM);
}

function findFreeSegmentContaining(
  free: readonly WallLabelAlongIntervalMm[],
  alongMm: number,
): WallLabelAlongIntervalMm | null {
  for (const s of free) {
    if (alongMm >= s.lo - ALONG_EPS_MM && alongMm <= s.hi + ALONG_EPS_MM) {
      return s;
    }
  }
  return null;
}

/**
 * Лучшая координата вдоль стены (мм): ближе всего к центру стены, при равенстве — более длинный сегмент, затем меньший lo.
 */
export function findBestWallLabelAlongMm(
  freeShrunk: readonly WallLabelAlongIntervalMm[],
  wallLenMm: number,
): number | null {
  const L = Math.max(0, wallLenMm);
  if (!freeShrunk.length || L < 1e-6) {
    return null;
  }
  const center = L / 2;
  let best: { readonly along: number; readonly dist: number; readonly segLen: number; readonly lo: number } | null =
    null;
  for (const s of freeShrunk) {
    const along = Math.min(Math.max(center, s.lo), s.hi);
    const dist = Math.abs(along - center);
    const segLen = s.hi - s.lo;
    if (
      !best ||
      dist < best.dist - 1e-6 ||
      (Math.abs(dist - best.dist) < 1e-6 && segLen > best.segLen + 1e-6) ||
      (Math.abs(dist - best.dist) < 1e-6 && Math.abs(segLen - best.segLen) < 1e-6 && s.lo < best.lo - 1e-6)
    ) {
      best = { along, dist, segLen, lo: s.lo };
    }
  }
  return best?.along ?? null;
}

const DEFAULT_ALONG_STEP_MM = 42;

/**
 * Детерминированный порядок кандидатов вдоль оси: сначала sticky, затем предпочтительная точка,
 * затем шаги внутри сегмента, затем центры остальных свободных сегментов.
 * Все точки должны лежать в freeAlong (не в запретной зоне по мм); узкие места отсекаются экранными проверками.
 */
export function buildWallLabelAlongCandidatesMm(
  freeAlong: readonly WallLabelAlongIntervalMm[],
  walkSegments: readonly WallLabelAlongIntervalMm[],
  wallLenMm: number,
  preferredAlongMm: number | null,
  stickyAlongMm: number | null,
  stepMm: number = DEFAULT_ALONG_STEP_MM,
): readonly number[] {
  const L = Math.max(0, wallLenMm);
  const out: number[] = [];
  const seen = new Set<string>();
  const add = (v: number) => {
    if (!Number.isFinite(v)) {
      return;
    }
    const clamped = Math.min(Math.max(0, v), L);
    const key = clamped.toFixed(1);
    if (seen.has(key)) {
      return;
    }
    if (!isAlongInsideFreeSegments(clamped, freeAlong)) {
      return;
    }
    seen.add(key);
    out.push(clamped);
  };

  if (stickyAlongMm != null) {
    add(stickyAlongMm);
  }
  if (preferredAlongMm != null) {
    add(preferredAlongMm);
  }

  const seed = preferredAlongMm ?? L / 2;
  const seg = findFreeSegmentContaining(walkSegments, seed) ?? findFreeSegmentContaining(freeAlong, seed);
  if (seg) {
    const step = Math.max(18, stepMm);
    for (let d = step; d <= seg.hi - seg.lo + 1e-6; d += step) {
      add(seed + d);
      add(seed - d);
    }
  }

  const sortedSegs = [...walkSegments].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  for (const s of sortedSegs) {
    add((s.lo + s.hi) / 2);
  }

  return out;
}

/** Отпечаток геометрии для инвалидации «липкого» слота марки стены. */
export function wallLabelPlacementFingerprint(wall: Wall, project: Project): string {
  const openings = openingsOnWallForLabel(wall, project)
    .map((o) => `${o.id}:${o.offsetFromStartMm}:${o.widthMm}:${o.kind}`)
    .sort()
    .join(",");
  return [
    wall.id,
    wall.start.x.toFixed(3),
    wall.start.y.toFixed(3),
    wall.end.x.toFixed(3),
    wall.end.y.toFixed(3),
    wall.thicknessMm.toFixed(2),
    (wall.markLabel ?? "").trim(),
    openings,
  ].join("|");
}

type StickyAlong = { readonly fingerprint: string; readonly alongMm: number };

const wallLabelStickyAlongByWallId = new Map<string, StickyAlong>();

export function getWallLabelStickyAlongMm(wallId: string, fingerprint: string): number | null {
  const s = wallLabelStickyAlongByWallId.get(wallId);
  return s && s.fingerprint === fingerprint ? s.alongMm : null;
}

export function setWallLabelStickyAlongMm(wallId: string, fingerprint: string, alongMm: number): void {
  wallLabelStickyAlongByWallId.set(wallId, { fingerprint, alongMm });
}

export function pruneWallLabelStickyState(validWallIds: ReadonlySet<string>): void {
  for (const id of wallLabelStickyAlongByWallId.keys()) {
    if (!validWallIds.has(id)) {
      wallLabelStickyAlongByWallId.delete(id);
    }
  }
}

/** «Липкий» along допустим, пока точка остаётся в свободном по мм участке (вне запретных зон). */
export function isWallLabelStickyAlongStillValid(
  alongMm: number,
  freeAlong: readonly WallLabelAlongIntervalMm[],
): boolean {
  return isAlongInsideFreeSegments(alongMm, freeAlong);
}

/** @deprecated Используйте buildWallLabelAlongCandidatesMm + findBestWallLabelAlongMm. */
export function alongStepsMmForWallLength(wallLenMm: number): readonly number[] {
  const L = Math.max(0, wallLenMm);
  const base: number[] = [0, 26, -26, 52, -52, 90, -90, 140, -140, 200, -200];
  if (L > 4000) {
    base.push(280, -280, 360, -360);
  }
  if (L < 1400) {
    return [0, 18, -18, 36, -36, 58, -58, 85, -85];
  }
  return base;
}
