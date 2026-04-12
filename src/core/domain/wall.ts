import type { Point2D } from "../geometry/types";

export interface Wall {
  readonly id: string;
  readonly layerId: string;
  /** Профиль сечения из project.profiles (обязателен для стен, созданных из инструмента). */
  readonly profileId?: string;
  readonly start: Point2D;
  readonly end: Point2D;
  readonly thicknessMm: number;
  readonly heightMm: number;
  /** Отметка низа стены от нуля проекта по Z, мм. */
  readonly baseElevationMm?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  /** Одинаковый id для стен, созданных одной операцией (например, контур прямоугольника). */
  readonly placementGroupId?: string;
  /** Префикс марки на момент создания (копия из профиля / effective). */
  readonly markPrefix?: string;
  /** Порядковый номер в рамках префикса в проекте. */
  readonly markSequenceNumber?: number;
  /** Полная марка, например "1S_3". */
  readonly markLabel?: string;
  /**
   * Подрезка верха по нижней рабочей поверхности кровли (команда «Подрезать под крышу»).
   * `heightMm` — по-прежнему максимум по торцам для проёмов и габаритов.
   */
  readonly roofUnderTrim?: {
    readonly roofPlaneId: string;
    readonly heightAtStartMm: number;
    readonly heightAtEndMm: number;
    /**
     * Верхний контур стены вдоль оси (мм от старта стены → высота над низом).
     * Строится по нижней рабочей поверхности кровли (пирог) с шагом вдоль стены и упрощением;
     * если отсутствует (старые проекты) — линейная интерполяция между heightAtStart/End.
     */
    readonly topProfileMm?: readonly { readonly alongMm: number; readonly heightMm: number }[];
  };
}
