import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

export type FoundationPileMoveCopyMode = "move" | "copy";

/**
 * Перенос или копия сваи: базовая точка (центр или угол) → вторая точка с привязкой.
 * Для copy {@link workingPileId} — уже созданная копия поверх оригинала до смещения.
 */
export interface FoundationPileMoveCopySession {
  readonly mode: FoundationPileMoveCopyMode;
  readonly sourcePileId: string;
  readonly workingPileId: string;
  readonly phase: "pickBase" | "pickTarget";
  /** Смещение от центра сваи к выбранной базовой точке (мм, мировые оси). */
  readonly baseOffsetFromCenterMm: Point2D | null;
  /** Превью центра сваи в фазе pickTarget. */
  readonly previewCenterMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
}
