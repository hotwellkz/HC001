import type { Point2D } from "../geometry/types";

/** Вспомогательный линейный объект 2D-плана (не стена, не участвует в 3D/расчётах). */
export interface PlanLine {
  readonly id: string;
  readonly layerId: string;
  readonly start: Point2D;
  readonly end: Point2D;
}

/** Минимальная длина отрезка (мм), чтобы не создавать вырожденные линии. */
export const MIN_PLAN_LINE_LENGTH_MM = 5;
