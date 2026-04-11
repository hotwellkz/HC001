import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

/**
 * Перенос балки перекрытия: базовая точка на контуре/оси → вторая точка с привязкой (как свая).
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
}
