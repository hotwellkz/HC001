import type { Point2D } from "../geometry/types";
import type { Wall } from "./wall";
import type { WallEndSide } from "./wallJoint";
import { MIN_WALL_SEGMENT_LENGTH_MM } from "./wallOps";
import { wallLengthMm } from "./wallCalculationGeometry";

export function wallAxisUnitStartToEnd(wall: Wall): { readonly ux: number; readonly uy: number; readonly L: number } {
  const L = wallLengthMm(wall);
  if (L < 1e-9) {
    return { ux: 1, uy: 0, L: 0 };
  }
  const ux = (wall.end.x - wall.start.x) / L;
  const uy = (wall.end.y - wall.start.y) / L;
  return { ux, uy, L };
}

/**
 * Новая длина (мм) по снапнутой точке: двигаемый конец едет вдоль оси от фиксированного.
 */
export function lengthFromSnappedPointForWallLengthEdit(
  fixedMm: Point2D,
  axisTowardMovingUx: number,
  axisTowardMovingUy: number,
  snappedWorldMm: Point2D,
  minLenMm: number,
): number {
  const vx = snappedWorldMm.x - fixedMm.x;
  const vy = snappedWorldMm.y - fixedMm.y;
  const raw = vx * axisTowardMovingUx + vy * axisTowardMovingUy;
  return Math.max(minLenMm, raw);
}

/**
 * Положение двигаемого торца при заданной длине сегмента (мм), фиксированный конец неподвижен.
 */
export function movingEndpointForLengthMm(
  fixedMm: Point2D,
  axisTowardMovingUx: number,
  axisTowardMovingUy: number,
  lengthMm: number,
): Point2D {
  const L = Math.max(MIN_WALL_SEGMENT_LENGTH_MM, lengthMm);
  return {
    x: fixedMm.x + axisTowardMovingUx * L,
    y: fixedMm.y + axisTowardMovingUy * L,
  };
}

/**
 * Собирает стену с новым положением выбранного торца; ось и толщина сохраняются.
 */
export function wallWithMovedEndAtLength(
  wall: Wall,
  movingEnd: WallEndSide,
  newLengthMm: number,
  minLenMm: number = MIN_WALL_SEGMENT_LENGTH_MM,
): Wall | null {
  const { ux, uy, L: L0 } = wallAxisUnitStartToEnd(wall);
  if (L0 < 1e-9) {
    return null;
  }
  const L = Math.max(minLenMm, newLengthMm);
  if (movingEnd === "end") {
    return {
      ...wall,
      end: {
        x: wall.start.x + ux * L,
        y: wall.start.y + uy * L,
      },
    };
  }
  return {
    ...wall,
    start: {
      x: wall.end.x - ux * L,
      y: wall.end.y - uy * L,
    },
  };
}

/** Вектор от фиксированного конца к двигаемому (единичный), для movingEnd === "end" совпадает с u(start→end). */
export function axisFromFixedTowardMoving(wall: Wall, movingEnd: WallEndSide): { readonly ux: number; readonly uy: number } {
  const { ux, uy, L } = wallAxisUnitStartToEnd(wall);
  if (L < 1e-9) {
    return { ux: 1, uy: 0 };
  }
  return movingEnd === "end" ? { ux, uy } : { ux: -ux, uy: -uy };
}

export function fixedEndpointForLengthChange(wall: Wall, movingEnd: WallEndSide): Point2D {
  return movingEnd === "end" ? { x: wall.start.x, y: wall.start.y } : { x: wall.end.x, y: wall.end.y };
}
