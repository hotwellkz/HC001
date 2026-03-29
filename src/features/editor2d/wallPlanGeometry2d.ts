/**
 * Геометрия полосы стены в плане (мм): ось start→end, смещение по нормали в мм.
 */

export interface Point2dMm {
  readonly x: number;
  readonly y: number;
}

/** Четыре угла четырёхугольника вдоль стены между смещениями offStartMm … offEndMm от осевой линии. */
export function quadCornersAlongWallMm(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  offStartMm: number,
  offEndMm: number,
): Point2dMm[] | null {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  return [
    { x: sx + px * offStartMm, y: sy + py * offStartMm },
    { x: ex + px * offStartMm, y: ey + py * offStartMm },
    { x: ex + px * offEndMm, y: ey + py * offEndMm },
    { x: sx + px * offEndMm, y: sy + py * offEndMm },
  ];
}
