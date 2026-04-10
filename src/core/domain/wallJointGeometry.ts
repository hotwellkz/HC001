import type { Point2D } from "../geometry/types";
import { MIN_WALL_SEGMENT_LENGTH_MM, segmentLengthMm } from "./wallOps";
import type { Wall } from "./wall";
import type { WallEndSide } from "./wallJoint";

const EPS = 1e-3;
const ANGLE_EPS = 1e-2;

export function isAxisAlignedWall(w: Wall): boolean {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  return Math.abs(dx) < EPS || Math.abs(dy) < EPS;
}

/** Бесконечные прямые двух ортогональных осевых стен — точка пересечения. */
export function orthogonalCenterlineIntersection(wa: Wall, wb: Wall): Point2D | null {
  if (!isAxisAlignedWall(wa) || !isAxisAlignedWall(wb)) {
    return null;
  }
  const aVert = Math.abs(wa.start.x - wa.end.x) < EPS;
  const bVert = Math.abs(wb.start.x - wb.end.x) < EPS;
  if (aVert === bVert) {
    return null;
  }
  if (aVert) {
    const xa = wa.start.x;
    const yb = wb.start.y;
    return { x: xa, y: yb };
  }
  const xa = wb.start.x;
  const yb = wa.start.y;
  return { x: xa, y: yb };
}

function endpoint(w: Wall, side: WallEndSide): Point2D {
  return side === "start" ? w.start : w.end;
}

function withEndpoint(w: Wall, side: WallEndSide, p: Point2D): Wall {
  const t = new Date().toISOString();
  if (side === "start") {
    return { ...w, start: { x: p.x, y: p.y }, updatedAt: t };
  }
  return { ...w, end: { x: p.x, y: p.y }, updatedAt: t };
}

/** От угла C вдоль стены к внутренней части сегмента (к другому концу). */
function unitInwardFromCorner(w: Wall, cornerSide: WallEndSide, corner: Point2D): { x: number; y: number } {
  const other = cornerSide === "start" ? w.end : w.start;
  const dx = other.x - corner.x;
  const dy = other.y - corner.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) {
    return { x: 1, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}

function unitOutwardFromCorner(w: Wall, cornerSide: WallEndSide, corner: Point2D): { x: number; y: number } {
  const uIn = unitInwardFromCorner(w, cornerSide, corner);
  return { x: -uIn.x, y: -uIn.y };
}

function normalize2(v: { readonly x: number; readonly y: number }): { x: number; y: number } {
  const len = Math.hypot(v.x, v.y);
  if (len < EPS) {
    return { x: 1, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

/** Единичный вектор вдоль оси стены (start → end). */
function unitAlongWallAxis(w: Wall): { x: number; y: number } {
  return normalize2({ x: w.end.x - w.start.x, y: w.end.y - w.start.y });
}

/**
 * Единичная нормаль к оси main, направленная от оси main к той полуплоскости,
 * где лежит тело второй стены (полоса ±t/2 от оси secondary).
 *
 * Для butt: торец secondary должен лечь в плоскость выбранной боковой грани main
 * (на расстоянии t_main/2 от оси main), а не на ось C и не на «половину» без
 * учёта грани.
 *
 * Вектор «вглубь» второй стены: от угла C к противоположному торцу secondary.
 * Он всегда вдоль оси secondary и перпендикулярен оси main — проекции на n1/n2 устойчивы.
 * Середина сегмента при симметрии относительно C даёт v≈0 и ломала выбор полуплоскости;
 * дальний конец устойчивее.
 */
function pickHalfPlaneNormal(
  n1: { x: number; y: number },
  n2: { x: number; y: number },
  v: { x: number; y: number },
): { x: number; y: number } {
  const d1 = dot(n1.x, n1.y, v.x, v.y);
  const d2 = dot(n2.x, n2.y, v.x, v.y);
  if (d1 > 0 && d2 <= 0) {
    return normalize2(n1);
  }
  if (d2 > 0 && d1 <= 0) {
    return normalize2(n2);
  }
  if (d1 > 0 && d2 > 0) {
    return d1 >= d2 ? normalize2(n1) : normalize2(n2);
  }
  return Math.abs(d1) <= Math.abs(d2) ? normalize2(n1) : normalize2(n2);
}

function normalFromMainCenterlineTowardSecondaryStrip(
  main: Wall,
  C: Point2D,
  secondary: Wall,
  secondaryEnd: WallEndSide,
): { x: number; y: number } {
  const uM = unitAlongWallAxis(main);
  const n1 = { x: -uM.y, y: uM.x };
  const n2 = { x: uM.y, y: -uM.x };
  const far = endpoint(secondary, secondaryEnd === "start" ? "end" : "start");
  let v = { x: far.x - C.x, y: far.y - C.y };
  if (Math.hypot(v.x, v.y) < EPS) {
    const mx = (secondary.start.x + secondary.end.x) / 2;
    const my = (secondary.start.y + secondary.end.y) / 2;
    v = { x: mx - C.x, y: my - C.y };
  }
  return pickHalfPlaneNormal(n1, n2, v);
}

export interface CornerJointGeomOk {
  readonly wallMain: Wall;
  readonly wallSecondary: Wall;
}

export type CornerJointGeomResult =
  | { ok: true; value: CornerJointGeomOk }
  | { ok: false; error: string };

/**
 * Угол: main — первая выбранная стена, secondary — вторая.
 */
export function computeCornerJointGeometry(
  kind: "CORNER_BUTT" | "CORNER_MITER",
  main: Wall,
  mainEnd: WallEndSide,
  secondary: Wall,
  secondaryEnd: WallEndSide,
): CornerJointGeomResult {
  if (main.id === secondary.id) {
    return { ok: false, error: "Выберите две разные стены." };
  }
  const C = orthogonalCenterlineIntersection(main, secondary);
  if (!C) {
    return { ok: false, error: "Нужны две ортогональные стены (горизонталь и вертикаль)." };
  }

  const dMain = Math.hypot(endpoint(main, mainEnd).x - C.x, endpoint(main, mainEnd).y - C.y);
  const dSec = Math.hypot(endpoint(secondary, secondaryEnd).x - C.x, endpoint(secondary, secondaryEnd).y - C.y);
  if (dMain > 500 || dSec > 500) {
    return { ok: false, error: "Выберите торцы у реального угла (слишком далеко от пересечения осей)." };
  }

  const tMain = main.thicknessMm;
  const tSec = secondary.thicknessMm;

  if (kind === "CORNER_MITER") {
    const uOutM = unitOutwardFromCorner(main, mainEnd, C);
    const uOutS = unitOutwardFromCorner(secondary, secondaryEnd, C);
    const pMain = { x: C.x + uOutM.x * (tMain / 2), y: C.y + uOutM.y * (tMain / 2) };
    const pSec = { x: C.x + uOutS.x * (tSec / 2), y: C.y + uOutS.y * (tSec / 2) };
    let wm = withEndpoint(main, mainEnd, pMain);
    let ws = withEndpoint(secondary, secondaryEnd, pSec);
    if (segmentLengthMm(wm.start, wm.end) < MIN_WALL_SEGMENT_LENGTH_MM) {
      return { ok: false, error: "После митры главная стена слишком короткая." };
    }
    if (segmentLengthMm(ws.start, ws.end) < MIN_WALL_SEGMENT_LENGTH_MM) {
      return { ok: false, error: "После митры вторая стена слишком короткая." };
    }
    return { ok: true, value: { wallMain: wm, wallSecondary: ws } };
  }

  /*
   * CORNER_BUTT: как у прямоугольного контура (fourWallMiteredCenterSegmentsFromRect): ось main у торца
   * продлевается от C на t_main/2 вдоль оси main наружу от угла — unitOutwardFromCorner (не внутрь
   * по сегменту). Иначе торец main визуально «обрезан» посередине толщины относительно стыка.
   * Вторичная стена: конец оси на плоскости боковой грани main (t_main/2 от оси main к телу secondary).
   */
  const uOut = unitOutwardFromCorner(main, mainEnd, C);
  const halfMain = tMain / 2;
  const mainCornerOnAxis = { x: C.x + uOut.x * halfMain, y: C.y + uOut.y * halfMain };
  const wm = withEndpoint(main, mainEnd, mainCornerOnAxis);
  const nTowardSec = normalFromMainCenterlineTowardSecondaryStrip(main, C, secondary, secondaryEnd);
  const pSec = { x: C.x + nTowardSec.x * halfMain, y: C.y + nTowardSec.y * halfMain };
  let ws = withEndpoint(secondary, secondaryEnd, pSec);
  if (segmentLengthMm(wm.start, wm.end) < MIN_WALL_SEGMENT_LENGTH_MM) {
    return { ok: false, error: "Главная стена слишком короткая." };
  }
  if (segmentLengthMm(ws.start, ws.end) < MIN_WALL_SEGMENT_LENGTH_MM) {
    return { ok: false, error: "Вторая стена после укорачивания слишком короткая." };
  }
  return { ok: true, value: { wallMain: wm, wallSecondary: ws } };
}

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

/** Проекция точки на отрезок [a,b], параметр 0..1 от a к b. */
export function closestPointOnSegment(a: Point2D, b: Point2D, p: Point2D): { point: Point2D; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < EPS * EPS) {
    return { point: { x: a.x, y: a.y }, t: 0 };
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return {
    point: { x: a.x + abx * t, y: a.y + aby * t },
    t,
  };
}

export interface TeeJointGeomOk {
  readonly abutting: Wall;
  readonly mainUnchanged: Wall;
}

export type TeeJointGeomResult = { ok: true; value: TeeJointGeomOk } | { ok: false; error: string };

/**
 * Внутренний и наружный углы плана при ортогональной митре: смещение на t/2 вдоль «внутрь/наружу» от пересечения осей C.
 * waEnd / wbEnd — торцы, сходящиеся в этой вершине.
 */
export function miterCornerInnerOuterPlanMm(
  wa: Wall,
  waEnd: WallEndSide,
  wb: Wall,
  wbEnd: WallEndSide,
): { readonly inner: Point2D; readonly outer: Point2D } | null {
  const C = orthogonalCenterlineIntersection(wa, wb);
  if (!C) {
    return null;
  }
  const uOutA = unitOutwardFromCorner(wa, waEnd, C);
  const uOutB = unitOutwardFromCorner(wb, wbEnd, C);
  const uInA = { x: -uOutA.x, y: -uOutA.y };
  const uInB = { x: -uOutB.x, y: -uOutB.y };
  const ha = wa.thicknessMm / 2;
  const hb = wb.thicknessMm / 2;
  return {
    inner: { x: C.x + uInA.x * ha + uInB.x * hb, y: C.y + uInA.y * ha + uInB.y * hb },
    outer: { x: C.x + uOutA.x * ha + uOutB.x * hb, y: C.y + uOutA.y * ha + uOutB.y * hb },
  };
}

/**
 * T-стык: примыкающая стена abutting, торец abuttingEnd; main — основная, pointOnMain — точка на оси main.
 */
export function computeTeeAbutmentGeometry(
  abutting: Wall,
  abuttingEnd: WallEndSide,
  main: Wall,
  pointOnMain: Point2D,
): TeeJointGeomResult {
  if (abutting.id === main.id) {
    return { ok: false, error: "Примыкание должно быть к другой стене." };
  }
  if (!isAxisAlignedWall(abutting) || !isAxisAlignedWall(main)) {
    return { ok: false, error: "Нужны ортогональные стены." };
  }

  const sa = { x: main.start.x, y: main.start.y };
  const ea = { x: main.end.x, y: main.end.y };
  const { point: P } = closestPointOnSegment(sa, ea, pointOnMain);

  const dirMain = { x: ea.x - sa.x, y: ea.y - sa.y };
  const lenM = Math.hypot(dirMain.x, dirMain.y);
  if (lenM < MIN_WALL_SEGMENT_LENGTH_MM) {
    return { ok: false, error: "Основная стена слишком короткая." };
  }
  const uM = { x: dirMain.x / lenM, y: dirMain.y / lenM };

  const dirAb = {
    x: abutting.end.x - abutting.start.x,
    y: abutting.end.y - abutting.start.y,
  };
  const lenA = Math.hypot(dirAb.x, dirAb.y);
  if (lenA < MIN_WALL_SEGMENT_LENGTH_MM) {
    return { ok: false, error: "Примыкающая стена слишком короткая." };
  }
  const uA = { x: dirAb.x / lenA, y: dirAb.y / lenA };

  if (Math.abs(dot(uM.x, uM.y, uA.x, uA.y)) > ANGLE_EPS) {
    return { ok: false, error: "Примыкание поддерживается только под прямым углом." };
  }

  const n1 = { x: -uM.y, y: uM.x };
  const n2 = { x: uM.y, y: -uM.x };
  const e0 = endpoint(abutting, abuttingEnd);
  const d1 = dot(e0.x - P.x, e0.y - P.y, n1.x, n1.y);
  const n = d1 >= 0 ? n1 : n2;

  const half = main.thicknessMm / 2 + abutting.thicknessMm / 2;
  const newEnd = { x: P.x + n.x * half, y: P.y + n.y * half };
  const next = withEndpoint(abutting, abuttingEnd, newEnd);
  if (segmentLengthMm(next.start, next.end) < MIN_WALL_SEGMENT_LENGTH_MM) {
    return { ok: false, error: "После примыкания стена слишком короткая." };
  }
  return { ok: true, value: { abutting: next, mainUnchanged: main } };
}
