import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

/**
 * Перенос балки перекрытия: базовая точка на контуре/оси → вторая точка с привязкой.
 * Вторая фаза использует ту же цепочку, что перенос стены: snap + углы 45°/90° + Shift-lock.
 */
export interface FloorBeamMoveCopySession {
  readonly sourceBeamId: string;
  readonly workingBeamId: string;
  readonly phase: "pickBase" | "pickTarget";
  /** Точка на балке (мир), за которую «цепляемся». */
  readonly baseAnchorWorldMm: Point2D | null;
  /** Смещение исходной геометрии в фазе pickTarget (мм). */
  readonly dragDeltaMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
  /** Превью конца отрезка смещения (фаза pickTarget), после {@link computeLinearSecondPointPreview}. */
  readonly previewTargetMm: Point2D | null;
  readonly angleSnapLockedDeg: number | null;
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly shiftLockReferenceMm: Point2D | null;
  /** Фаза pickBase: примагниченная к характерным точкам балки позиция под крестиком. */
  readonly pickBaseHoverWorldMm: Point2D | null;
  readonly pickBaseHoverSnapKind: SnapKind | null;
}
