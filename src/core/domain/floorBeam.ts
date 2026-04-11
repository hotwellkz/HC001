import type { LinearProfilePlacementMode } from "../geometry/linearPlacementGeometry";
import type { Point2D } from "../geometry/types";

/**
 * Линейный элемент перекрытия (балка/доска по профилю): две опорные точки построения,
 * режим привязки сечения к линии и ориентация сечения в плане/по высоте.
 */
export interface FloorBeamEntity {
  readonly id: string;
  readonly layerId: string;
  readonly profileId: string;
  /** Первая точка линии построения (как задал пользователь), мм. */
  readonly refStartMm: Point2D;
  /** Вторая точка линии построения, мм. */
  readonly refEndMm: Point2D;
  /** Режим привязки профиля к линии построения (центр / левый / правый край). */
  readonly linearPlacementMode: LinearProfilePlacementMode;
  /**
   * Развернуть сечение: меняются местами «ширина в плане» и «высота по Z»
   * относительно базовой пары размеров профиля.
   */
  readonly sectionRolled: boolean;
  /** Отметка низа балки от нуля проекта по Z, мм (аналог стены). */
  readonly baseElevationMm: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
