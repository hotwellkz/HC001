import type { Point2D } from "../geometry/types";
import type { EntityCopyStrategyId } from "./entityCopySession";

const TOL_MM = 1e-6;

/**
 * Мировые точки, в которые должна попасть точка привязки каждой новой копии (исходный объект не двигается).
 */
export function computeEntityCopyAnchorWorldTargets(
  strategy: EntityCopyStrategyId,
  worldP0: Point2D,
  worldP1: Point2D,
  count: number,
): readonly Point2D[] {
  if (count < 1 || !Number.isFinite(count)) {
    return [];
  }
  const dx = worldP1.x - worldP0.x;
  const dy = worldP1.y - worldP0.y;
  if (Math.hypot(dx, dy) < TOL_MM) {
    return [];
  }

  if (strategy === "distributionMinusOne") {
    const out: Point2D[] = [];
    const n = count;
    for (let i = 1; i <= n; i += 1) {
      const t = i / (n + 1);
      out.push({ x: worldP0.x + dx * t, y: worldP0.y + dy * t });
    }
    return out;
  }

  if (strategy === "increment") {
    const out: Point2D[] = [];
    for (let i = 1; i <= count; i += 1) {
      out.push({ x: worldP0.x + dx * i, y: worldP0.y + dy * i });
    }
    return out;
  }

  // distribution — равномерно по отрезку [P0, P1], включая концы
  if (count === 1) {
    return [{ x: worldP0.x + dx * 0.5, y: worldP0.y + dy * 0.5 }];
  }
  const out: Point2D[] = [];
  const denom = count - 1;
  for (let i = 0; i < count; i += 1) {
    const t = i / denom;
    out.push({ x: worldP0.x + dx * t, y: worldP0.y + dy * t });
  }
  return out;
}
