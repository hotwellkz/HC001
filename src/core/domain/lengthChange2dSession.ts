import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";
import type { WallEndSide } from "./wallJoint";

/**
 * Инструмент «Изменение длины» на 2D: после выбора торца стены — перетаскивание
 * (клик–движение–клик) с фиксацией противоположного конца.
 */
export interface LengthChange2dSession {
  readonly wallId: string;
  readonly movingEnd: WallEndSide;
  /** Неподвижный конец в мировых координатах (мм). */
  readonly fixedEndMm: Point2D;
  /** Единичный вектор от start стены к end (на момент начала операции). */
  readonly axisUx: number;
  readonly axisUy: number;
  readonly initialLengthMm: number;
  /** Текущее положение двигаемого торца (мм), вдоль оси. */
  readonly previewMovingMm: Point2D;
  readonly lastSnapKind: SnapKind | null;
}
