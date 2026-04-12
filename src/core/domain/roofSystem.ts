import type { Point2D } from "../geometry/types";

/** Тип простой крыши, задаваемой контуром и общими параметрами. */
export type RoofSystemKind = "mono" | "gable" | "hip";

/**
 * Единая логическая крыша: контур + параметры; скаты — производные `RoofPlaneEntity` с тем же `roofSystemId`.
 * Источник истины для угла, свесов (перекрывают значения из профиля при расчёте) и линий конька в 2D.
 */
export interface RoofSystemEntity {
  readonly id: string;
  readonly type: "roofSystem";
  readonly layerId: string;
  readonly roofKind: RoofSystemKind;
  /** Замкнутый контур основания (мм), CCW; на первом этапе — прямоугольник 4 вершины. */
  readonly footprintMm: readonly Point2D[];
  readonly profileId: string;
  readonly pitchDeg: number;
  readonly baseLevelMm: number;
  /** Свес по карнизу (мм) — подставляется в расчёт свесов вместо eave из профиля. */
  readonly eaveOverhangMm: number;
  /** Боковой свес (мм) — подставляется вместо side из профиля. */
  readonly sideOverhangMm: number;
  /**
   * Дополнительный выпуск кровельного покрытия за линию карниза (мм), только для слоя покрытия в 2D/3D.
   * Не увеличивает конструктивный свес и не смещает остальные слои кровельного пирога.
   */
  readonly roofCoverEaveProjectionMm: number;
  /**
   * Направление конька: ось «вдоль конька» на плане (единичный вектор).
   * Для односкатной — ортогонально линии стока (вдоль «верхней» стороны прямоугольника).
   */
  readonly ridgeUnitPlan: Point2D;
  /** Направление стока (к низу ската), единичный вектор на плане; для односкатной задаёт уклон. */
  readonly drainUnitPlan: Point2D;
  /** Параметр генератора: конёк вдоль более короткой или длинной стороны прямоугольника (двускатная / вальмовая). */
  readonly ridgeAlong: "short" | "long";
  /** Идентификаторы созданных скатов (порядок не гарантирован). */
  readonly generatedPlaneIds: readonly string[];
  /** Отрезки линии конька в плане (для 2D). */
  readonly ridgeSegmentsPlanMm: readonly RoofRidgeSegmentMm[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoofRidgeSegmentMm {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
}

/** Выпуск покрытия по карнизу из записи крыши-генератора (мм); для прочих скатов — 0. */
export function roofCoverEaveProjectionMmForPlane(
  project: { readonly roofSystems: readonly RoofSystemEntity[] },
  rp: { readonly roofSystemId?: string },
): number {
  if (!rp.roofSystemId) {
    return 0;
  }
  const sys = project.roofSystems.find((s) => s.id === rp.roofSystemId);
  if (!sys) {
    return 0;
  }
  const v = sys.roofCoverEaveProjectionMm;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}
