import type { Point2D } from "./types";

export function unitDirectionOrNull(from: Point2D, to: Point2D): Point2D | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  return { x: dx / len, y: dy / len };
}

/**
 * Проекция точки на луч origin + t * u, t ≥ 0 (назад не уходим).
 */
export function projectPointOntoRayForward(origin: Point2D, unit: Point2D, point: Point2D): Point2D {
  const vx = point.x - origin.x;
  const vy = point.y - origin.y;
  let t = vx * unit.x + vy * unit.y;
  if (t < 0) {
    t = 0;
  }
  return { x: origin.x + t * unit.x, y: origin.y + t * unit.y };
}
