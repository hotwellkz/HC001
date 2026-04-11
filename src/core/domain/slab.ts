import type { Point2D } from "../geometry/types";

/**
 * Плита (монолитная плита перекрытия / фундаментная плита и т.п.): контур в плане + вертикальные параметры относительно нуля проекта.
 * Геометрия — один замкнутый многоугольник (прямоугольник = 4 вершины).
 */
export interface SlabEntity {
  readonly id: string;
  readonly layerId: string;
  /** Вершины контура в плане (мм), замыкание не дублируется в конце массива. */
  readonly pointsMm: readonly Point2D[];
  /** Отметка верхней грани плиты от нуля проекта по Z, мм. */
  readonly levelMm: number;
  /** Толщина вниз от верхней грани, мм (> 0). */
  readonly depthMm: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
