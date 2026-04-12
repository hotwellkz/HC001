import type { RoofRafterEntity } from "@/core/domain/roofRafter";
import { projectPointToSegment } from "@/core/geometry/lineSegment";

/**
 * Выбор стропила по клику: ближайший отрезок ось-проекция (низ–конёк) в плане.
 */
export function pickRoofRafterAtPlanPoint(
  rafters: readonly RoofRafterEntity[],
  worldMm: { readonly x: number; readonly y: number },
  tolMm: number,
): RoofRafterEntity | null {
  let best: { r: RoofRafterEntity; d2: number } | null = null;
  const tol2 = tolMm * tolMm;
  for (const r of rafters) {
    const { distanceSq } = projectPointToSegment(worldMm, { a: r.footPlanMm, b: r.ridgePlanMm });
    if (distanceSq <= tol2 && (!best || distanceSq < best.d2)) {
      best = { r, d2: distanceSq };
    }
  }
  return best?.r ?? null;
}
