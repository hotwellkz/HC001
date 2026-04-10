import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

export type WallMoveCopyMode = "move" | "copy";

/**
 * Перенос или копия стены: опорная точка на стене → вторая точка задаёт смещение (как у инструмента стены).
 * Для copy {@link workingWallId} — уже вставленная копия, совпадающая с оригиналом до смещения.
 */
export interface WallMoveCopySession {
  readonly mode: WallMoveCopyMode;
  /** Исходная стена (для copy — до дублирования; для move совпадает с working). */
  readonly sourceWallId: string;
  readonly workingWallId: string;
  readonly phase: "pickAnchor" | "pickTarget";
  readonly anchorWorldMm: Point2D | null;
  readonly previewTargetMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
  readonly angleSnapLockedDeg: number | null;
}
