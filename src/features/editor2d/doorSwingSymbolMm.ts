import type { Wall } from "@/core/domain/wall";

/**
 * Точка на оси стены (центр толщины в плане) на заданном расстоянии вдоль оси от {@link Wall.start}.
 * Используется как опора 2D-символа двери (петля, начало полотна, центр дуги).
 */
export function wallCenterlinePointAtAlongMm(
  wall: Pick<Wall, "start" | "end">,
  alongMm: number,
): { readonly x: number; readonly y: number } | null {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    x: wall.start.x + ux * alongMm,
    y: wall.start.y + uy * alongMm,
  };
}
