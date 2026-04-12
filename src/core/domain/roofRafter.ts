import type { LinearElementSectionOrientation } from "./floorBeamSection";
import type { Point2D } from "../geometry/types";

/**
 * Сгенерированная стропильная нога: ось от опоры на перекрытии до конька,
 * с привязкой к скату и доске чердачного перекрытия.
 */
export interface RoofRafterEntity {
  readonly id: string;
  readonly type: "roofRafter";
  readonly layerId: string;
  /** Логическая крыша-генератор (двускатная), к которой относится стропило. */
  readonly roofSystemId: string;
  readonly profileId: string;
  /** Доска перекрытия, на которую опирается нижний узел (конструктивная связь). */
  readonly supportingFloorBeamId: string;
  /** Вторая стропилина пары (другой скат), если включены парные стропила. */
  readonly pairedRoofRafterId: string | null;
  readonly roofPlaneId: string;
  /** Центр нижнего опирания (проекция оси), мм в плане. */
  readonly footPlanMm: Point2D;
  /** Точка на коньке (проекция оси), мм в плане. */
  readonly ridgePlanMm: Point2D;
  /** Мировая отметка низа оси (верх перекрытия), мм. */
  readonly footElevationMm: number;
  /** Мировая отметка верха на линии конька, мм. */
  readonly ridgeElevationMm: number;
  /**
   * Ориентация сечения в 3D (плашмя / на ребро). Для стропил по умолчанию `edge`.
   * Если поле отсутствует в старых проектах — считается `edge`.
   */
  readonly sectionOrientation?: LinearElementSectionOrientation;
  /** Согласовано с {@link LinearElementSectionOrientation}: `true` = на ребро. */
  readonly sectionRolled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Ориентация сечения для 3D: явное поле или `edge` (в т.ч. для старых проектов без поля). */
export function resolveRoofRafterSectionOrientation(r: RoofRafterEntity): LinearElementSectionOrientation {
  return r.sectionOrientation === "flat" ? "flat" : "edge";
}
