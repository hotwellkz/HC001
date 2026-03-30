/**
 * Геометрия расчётных досок на 2D-плане: границы вдоль оси стены (owner wall).
 * Координаты startOffsetMm/endOffsetMm — в локальной системе стены [0 … wallLengthMm].
 */

const EPS_MM = 1e-4;

/**
 * Ограничивает интервал вдоль стены границами [0, wallLengthMm], исключает вырожденные отрезки.
 * Убирает визуальный «вылет» за торец и ложное укорочение из-за погрешностей/пересечений.
 */
export function clampAlongWallRangeMm(
  startOffsetMm: number,
  endOffsetMm: number,
  wallLengthMm: number,
): { readonly lo: number; readonly hi: number } | null {
  const L = wallLengthMm;
  if (L < EPS_MM || !Number.isFinite(L)) {
    return null;
  }
  const a = Math.min(startOffsetMm, endOffsetMm);
  const b = Math.max(startOffsetMm, endOffsetMm);
  const lo = Math.min(L, Math.max(0, a));
  const hi = Math.min(L, Math.max(0, b));
  if (hi - lo < EPS_MM) {
    return null;
  }
  return { lo, hi };
}

export interface Point2dMm {
  readonly x: number;
  readonly y: number;
}

/** Точка внутри простого многоугольника (мм), план стены. */
export function pointInPolygonMm(px: number, py: number, corners: readonly Point2dMm[]): boolean {
  if (corners.length < 3) {
    return false;
  }
  let inside = false;
  const n = corners.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = corners[i]!.x;
    const yi = corners[i]!.y;
    const xj = corners[j]!.x;
    const yj = corners[j]!.y;
    const dy = yj - yi;
    if (Math.abs(dy) < 1e-12) {
      continue;
    }
    const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / dy + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}
