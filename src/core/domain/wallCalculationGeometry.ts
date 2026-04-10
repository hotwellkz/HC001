import type { Point2D } from "../geometry/types";
import { closestPointOnSegment } from "./wallJointGeometry";
import type { Wall } from "./wall";

export function wallLengthMm(wall: Wall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
}

/** Расстояние вдоль оси стены от start до проекции точки на отрезок [start, end], мм. */
export function distanceAlongWallFromStartMm(wall: Wall, point: Point2D): number {
  const { t } = closestPointOnSegment(wall.start, wall.end, point);
  const L = wallLengthMm(wall);
  return t * L;
}

/**
 * Скалярное расстояние вдоль направления start→end до точки (без усечения по отрезку).
 * Нужно для опор «наружного угла» с отрицательным вдоль оси относительно start.
 */
export function distanceAlongWallAxisFromStartUnclampedMm(wall: Wall, point: Point2D): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) {
    return 0;
  }
  const ux = dx / L;
  const uy = dy / L;
  const vx = point.x - wall.start.x;
  const vy = point.y - wall.start.y;
  return vx * ux + vy * uy;
}
