import type { Point2D } from "@/core/geometry/types";

import type { ViewportTransform } from "./viewportTransforms";
import { screenToWorld, worldToScreen } from "./viewportTransforms";

export type GridLineKind = "major" | "minor";

export interface GridLine {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly kind: GridLineKind;
}

/** Крупный шаг сетки на чертеже (м): линии кратные этому значению рисуются чуть заметнее. Не влияет на snap. */
export const GRID_MAJOR_STEP_MM = 1000;

const MAJOR_EPS = 1e-3;

export function isMajorGridWorldMm(valueMm: number, originMm: number, majorStepMm: number): boolean {
  if (!(majorStepMm > 0) || !Number.isFinite(valueMm) || !Number.isFinite(originMm)) {
    return true;
  }
  const d = valueMm - originMm;
  const n = d / majorStepMm;
  return Math.abs(n - Math.round(n)) < MAJOR_EPS;
}

/**
 * Линии сетки в экранных координатах (обрезка по видимому миру с запасом).
 */
export function buildScreenGridLines(
  widthPx: number,
  heightPx: number,
  t: ViewportTransform,
  stepMm: number,
  /** База плана: линии сетки проходят через эту точку в мировых мм (null → ось 0). */
  originMm: Point2D | null = null,
  majorStepMm: number = GRID_MAJOR_STEP_MM,
): GridLine[] {
  if (stepMm <= 0) {
    return [];
  }
  const ox = originMm?.x ?? 0;
  const oy = originMm?.y ?? 0;
  const corners = [
    screenToWorld(0, 0, t),
    screenToWorld(widthPx, 0, t),
    screenToWorld(widthPx, heightPx, t),
    screenToWorld(0, heightPx, t),
  ];
  const minX = Math.min(...corners.map((c) => c.x));
  const maxX = Math.max(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const maxY = Math.max(...corners.map((c) => c.y));
  const pad = stepMm * 4;
  const gx0 = Math.floor((minX - pad - ox) / stepMm) * stepMm + ox;
  const gx1 = Math.ceil((maxX + pad - ox) / stepMm) * stepMm + ox;
  const gy0 = Math.floor((minY - pad - oy) / stepMm) * stepMm + oy;
  const gy1 = Math.ceil((maxY + pad - oy) / stepMm) * stepMm + oy;

  const lines: GridLine[] = [];
  for (let x = gx0; x <= gx1; x += stepMm) {
    const a = worldToScreen(x, minY - pad, t);
    const b = worldToScreen(x, maxY + pad, t);
    const kind: GridLineKind = isMajorGridWorldMm(x, ox, majorStepMm) ? "major" : "minor";
    lines.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, kind });
  }
  for (let y = gy0; y <= gy1; y += stepMm) {
    const a = worldToScreen(minX - pad, y, t);
    const b = worldToScreen(maxX + pad, y, t);
    const kind: GridLineKind = isMajorGridWorldMm(y, oy, majorStepMm) ? "major" : "minor";
    lines.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, kind });
  }
  return lines;
}
