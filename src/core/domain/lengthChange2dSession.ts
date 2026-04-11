import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";
import type { WallEndSide } from "./wallJoint";

export type LengthChange2dTarget =
  | { readonly kind: "wall"; readonly wallId: string }
  | { readonly kind: "floorBeam"; readonly beamId: string };

/**
 * Инструмент «Изменение длины» на 2D: после выбора торца линейного объекта — перетаскивание
 * (клик–движение–клик) с фиксацией противоположного конца.
 */
export interface LengthChange2dSession {
  readonly target: LengthChange2dTarget;
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
  /** Пока зажат Shift после фиксации: направление изменения длины (совпадает с осью сегмента). */
  readonly shiftDirectionLockUnit: Point2D | null;
  /** Опорная точка Q при Shift-lock snap. */
  readonly shiftLockReferenceMm: Point2D | null;
}
