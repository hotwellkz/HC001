import type { Point2D } from "../geometry/types";

const AREA_EPS = 1e-3;
const LEN_EPS = 1e-6;

export function polygonSignedAreaMm(pts: readonly Point2D[]): number {
  if (pts.length < 3) {
    return 0;
  }
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % pts.length]!;
    a += p0.x * p1.y - p1.x * p0.y;
  }
  return a / 2;
}

function orient(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point2D, b: Point2D, p: Point2D): boolean {
  return (
    p.x <= Math.max(a.x, b.x) + LEN_EPS &&
    p.x + LEN_EPS >= Math.min(a.x, b.x) &&
    p.y <= Math.max(a.y, b.y) + LEN_EPS &&
    p.y + LEN_EPS >= Math.min(a.y, b.y)
  );
}

/** Пересечение отрезков ab и cd (включая касание в вершине для не-соседних рёбер полигона). */
export function segmentsIntersectOrTouch(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);

  if (
    (o1 > LEN_EPS && o2 > LEN_EPS) ||
    (o1 < -LEN_EPS && o2 < -LEN_EPS) ||
    (o3 > LEN_EPS && o4 > LEN_EPS) ||
    (o3 < -LEN_EPS && o4 < -LEN_EPS)
  ) {
    return false;
  }

  if (Math.abs(o1) <= LEN_EPS && onSegment(a, b, c)) {
    return true;
  }
  if (Math.abs(o2) <= LEN_EPS && onSegment(a, b, d)) {
    return true;
  }
  if (Math.abs(o3) <= LEN_EPS && onSegment(c, d, a)) {
    return true;
  }
  if (Math.abs(o4) <= LEN_EPS && onSegment(c, d, b)) {
    return true;
  }
  return true;
}

/**
 * Самопересечение замкнутого контура (последняя вершина соединяется с первой).
 * Пропускаем пары соседних рёбер, включая пару (последнее, первое).
 */
export function polygonEdgesSelfIntersect(pts: readonly Point2D[]): boolean {
  const n = pts.length;
  if (n < 4) {
    return false;
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1) {
        continue;
      }
      if (i === 0 && j === n - 1) {
        continue;
      }
      const c = pts[j]!;
      const d = pts[(j + 1) % n]!;
      if (segmentsIntersectOrTouch(a, b, c, d)) {
        return true;
      }
    }
  }
  return false;
}

/** Прямоугольник по двум противоположным углам (любой порядок), обход против часовой стрелки в плане. */
export function rectangleCornersFromDiagonalMm(cornerA: Point2D, cornerB: Point2D): Point2D[] {
  const xmin = Math.min(cornerA.x, cornerB.x);
  const xmax = Math.max(cornerA.x, cornerB.x);
  const ymin = Math.min(cornerA.y, cornerB.y);
  const ymax = Math.max(cornerA.y, cornerB.y);
  return [
    { x: xmin, y: ymin },
    { x: xmax, y: ymin },
    { x: xmax, y: ymax },
    { x: xmin, y: ymax },
  ];
}

export type SlabPolygonValidation = { readonly ok: true } | { readonly ok: false; readonly message: string };

export function validateSlabPolygonMm(pts: readonly Point2D[]): SlabPolygonValidation {
  if (pts.length < 3) {
    return { ok: false, message: "У контура должно быть не меньше трёх вершин." };
  }
  const area = polygonSignedAreaMm(pts);
  if (Math.abs(area) < AREA_EPS) {
    return { ok: false, message: "Площадь контура слишком мала (нулевая)." };
  }
  if (polygonEdgesSelfIntersect(pts)) {
    return { ok: false, message: "Контур не должен самопересекаться." };
  }
  return { ok: true };
}

export function validateSlabDepthLevel(depthMm: number, levelMm: number): SlabPolygonValidation {
  if (!Number.isFinite(depthMm) || depthMm <= 0) {
    return { ok: false, message: "Глубина должна быть числом больше 0 (мм)." };
  }
  if (!Number.isFinite(levelMm)) {
    return { ok: false, message: "Уровень должен быть числом (мм)." };
  }
  return { ok: true };
}
