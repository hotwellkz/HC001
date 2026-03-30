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
