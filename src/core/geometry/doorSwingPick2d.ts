import type { DoorOpeningSwing } from "@/core/domain/opening";
import type { Wall } from "@/core/domain/wall";
import type { Point2D } from "./types";

/** Мёртвая зона в мм вдоль локальных осей стены (гистерезис у разделяющих линий). */
export const DOOR_SWING_PICK_DEAD_ZONE_MM = 55;

export function wallTangentNormalUnits(wall: Wall): { ux: number; uy: number; nx: number; ny: number } | null {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const ux = dx / len;
  const uy = dy / len;
  return { ux, uy, nx: -uy, ny: ux };
}

export function doorOpeningCenterPointMm(wall: Wall, leftAlongMm: number, widthMm: number): Point2D | null {
  const f = wallTangentNormalUnits(wall);
  if (!f) {
    return null;
  }
  const midAlong = leftAlongMm + widthMm * 0.5;
  return {
    x: wall.start.x + f.ux * midAlong,
    y: wall.start.y + f.uy * midAlong,
  };
}

/** Проекции вектора «центр проёма → курсор» на касательную и нормаль стены (как в 2D-отрисовке двери). */
export function doorCursorLocalDots(
  cursorWorldMm: Point2D,
  wall: Wall,
  leftAlongMm: number,
  widthMm: number,
): { tDot: number; nDot: number } | null {
  const f = wallTangentNormalUnits(wall);
  const c = doorOpeningCenterPointMm(wall, leftAlongMm, widthMm);
  if (!f || !c) {
    return null;
  }
  const vx = cursorWorldMm.x - c.x;
  const vy = cursorWorldMm.y - c.y;
  return {
    tDot: vx * f.ux + vy * f.uy,
    nDot: vx * f.nx + vy * f.ny,
  };
}

/**
 * Четыре варианта по знакам проекций на tangent и normal:
 * tangent ≥ 0 → петли у конца проёма (в сторону +u), иначе у начала;
 * normal ≥ 0 → «out_*», иначе «in_*» (согласовано с drawDoorSwing2d).
 */
export function doorSwingFromWallLocalDots(tDot: number, nDot: number): DoorOpeningSwing {
  const hingeRight = tDot >= 0;
  const swingOut = nDot >= 0;
  if (swingOut && hingeRight) {
    return "out_right";
  }
  if (swingOut && !hingeRight) {
    return "out_left";
  }
  if (!swingOut && hingeRight) {
    return "in_right";
  }
  return "in_left";
}

function swingToTN(s: DoorOpeningSwing): { tSign: 1 | -1; nSign: 1 | -1 } {
  const hingeRight = s.endsWith("right");
  const swingOut = s.startsWith("out");
  return { tSign: hingeRight ? 1 : -1, nSign: swingOut ? 1 : -1 };
}

/** Узкие полосы вдоль осей сохраняют предыдущий квадрант, чтобы не мигать на границах. */
export function resolveDoorSwingWithHysteresis(
  tDot: number,
  nDot: number,
  prev: DoorOpeningSwing | null,
  deadMm: number,
): DoorOpeningSwing {
  if (!prev) {
    return doorSwingFromWallLocalDots(tDot, nDot);
  }
  const { tSign, nSign } = swingToTN(prev);
  const tUse = Math.abs(tDot) < deadMm ? tSign * deadMm : tDot;
  const nUse = Math.abs(nDot) < deadMm ? nSign * deadMm : nDot;
  return doorSwingFromWallLocalDots(tUse, nUse);
}
