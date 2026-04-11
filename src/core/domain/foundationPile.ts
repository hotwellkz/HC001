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
  /**
   * Если задано — свая создана автоматически для ленты; при обновлении авто-свай
   * удаляются только с тем же batchId, что и у сохранённой конфигурации ленты.
   */
  readonly autoPileBatchId?: string;
}
