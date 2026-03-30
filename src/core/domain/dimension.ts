import type { Point2D } from "../geometry/types";

/** Автогабариты прямоугольной коробки из 4 стен (связь с placementGroupId). */
export type RectangleOverallDimensionKind = "rectangle_outer_horizontal" | "rectangle_outer_vertical";

export interface Dimension {
  readonly id: string;
  readonly a: Point2D;
  readonly b: Point2D;
  /** Смещение размерной линии от линии измерения (мм), знак задаётся видом при отрисовке. */
  readonly offsetMm?: number;
  readonly kind?: RectangleOverallDimensionKind;
  readonly placementGroupId?: string;
  readonly wallIds?: readonly string[];
  readonly layerId?: string;
  readonly textValueMm?: number;
  readonly extensionOvershootMm?: number;
}
