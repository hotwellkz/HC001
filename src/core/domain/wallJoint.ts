import type { Point2D } from "../geometry/types";

/** Семантика узла стен (не только геометрия). */
export type WallJointKind = "CORNER_BUTT" | "CORNER_MITER" | "T_ABUTMENT";

export type WallEndSide = "start" | "end";

/**
 * Связь двух стен с типом узла.
 * - Углы: wallA — первая выбранная (для butt — главная), wallB — вторая; оба торца заданы.
 * - T: wallA — примыкающая стена, wallAEnd — торец у основной; wallB — основная (проходная);
 *   teePointOnMainMm — точка на оси основной стены, к которой подведён примык.
 */
export interface WallJoint {
  readonly id: string;
  readonly kind: WallJointKind;
  readonly wallAId: string;
  readonly wallAEnd: WallEndSide;
  readonly wallBId: string;
  /** Для CORNER_* — торец второй стены. Для T — не используется. */
  readonly wallBEnd?: WallEndSide;
  /** Для T_ABUTMENT: точка на оси основной стены (мм). */
  readonly teePointOnMainMm?: Point2D;
}
