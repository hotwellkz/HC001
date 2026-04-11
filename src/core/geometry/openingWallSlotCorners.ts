import type { Wall } from "../domain/wall";
import type { Point2D } from "./types";

/**
 * Четыре угла прямоугольника проёма в плане (вдоль стены, в полосе толщины).
 * Согласовано с `openingPlanGeometry2d.openingSlotCornersMm(..., 0)`.
 */
export function openingWallSlotCornersInset0Mm(
  wall: Wall,
  leftAlongMm: number,
  openingWidthMm: number,
): Point2D[] | null {
  const sx = wall.start.x;
  const sy = wall.start.y;
  const ex = wall.end.x;
  const ey = wall.end.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const ux = dx / len;
  const uy = dy / len;
  const T = wall.thicknessMm;
  const h = Math.max(0, T / 2);
  const w0 = leftAlongMm;
  const w1 = leftAlongMm + openingWidthMm;
  return [
    { x: sx + ux * w0 + uy * h, y: sy + uy * w0 - ux * h },
    { x: sx + ux * w1 + uy * h, y: sy + uy * w1 - ux * h },
    { x: sx + ux * w1 - uy * h, y: sy + uy * w1 + ux * h },
    { x: sx + ux * w0 - uy * h, y: sy + uy * w0 + ux * h },
  ];
}
