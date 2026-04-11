import type { PlanLine } from "@/core/domain/planLine";
import type { Point2D } from "@/core/geometry/types";
import { closestPointOnSegment } from "@/core/geometry/snap2d";

export function pickClosestPlanLineAlongPoint(
  worldMm: Point2D,
  lines: readonly PlanLine[],
  toleranceMm: number,
): { readonly planLineId: string } | null {
  let best: { planLineId: string; d: number } | null = null;
  for (const ln of lines) {
    const { point } = closestPointOnSegment(worldMm, ln.start, ln.end);
    const d = Math.hypot(worldMm.x - point.x, worldMm.y - point.y);
    if (d <= toleranceMm && (!best || d < best.d)) {
      best = { planLineId: ln.id, d };
    }
  }
  return best ? { planLineId: best.planLineId } : null;
}
