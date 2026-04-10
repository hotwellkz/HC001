/**
 * Угол сегмента в системе Pixi/canvas (ось Y вниз).
 * Приводит к эквивалентному углу в (-π/2, π/2], чтобы текст не был перевёрнут на 180°
 * относительно направления чтения слева направо.
 */
export function readableAlongSegmentRotationRad(segmentAngleRad: number): number {
  let a = segmentAngleRad;
  if (a > Math.PI / 2) {
    a -= Math.PI;
  } else if (a < -Math.PI / 2) {
    a += Math.PI;
  }
  return a;
}
