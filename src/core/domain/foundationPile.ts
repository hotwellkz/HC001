/** Тип сваи (расширяемо: винтовая — заготовка без полной реализации). */
export type FoundationPileKind = "reinforcedConcrete" | "screw";

/**
 * Свая на плане фундамента: центр в (centerX, centerY), вертикальные параметры относительно нуля слоя.
 */
export interface FoundationPileEntity {
  readonly id: string;
  readonly layerId: string;
  readonly pileKind: FoundationPileKind;
  readonly centerX: number;
  readonly centerY: number;
  /** Сечение ствола по плану (квадрат), мм. */
  readonly sizeMm: number;
  /** Размер верхней площадки по плану (квадрат), мм. */
  readonly capSizeMm: number;
  /** Длина ствола вниз от верха, мм. */
  readonly heightMm: number;
  /** Отметка верха сваи относительно нуля слоя, мм. */
  readonly levelMm: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
