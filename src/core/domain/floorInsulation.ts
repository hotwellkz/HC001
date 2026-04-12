import type { Point2D } from "../geometry/types";

/** Как ориентировать лист относительно направления балок. */
export type FloorInsulationLayoutMode = "alongBeams" | "acrossBeams" | "auto";

/** Способ задания области заполнения на плане (инструмент утепления). */
export type FloorInsulationAreaMode = "rectangle" | "polygon";

/** Параметры шаблона утеплителя перекрытия (лист EPS). */
export interface FloorInsulationTemplateParams {
  readonly materialLabel: string;
  /** Длина листа в плане вдоль «основной» стороны раскладки, мм (обычно 2400). */
  readonly sheetLengthMm: number;
  /** Ширина листа, мм (обычно 1200). */
  readonly sheetWidthMm: number;
  /** Толщина по Z, мм. */
  readonly thicknessMm: number;
  /** Монтажный зазор (зарезервировано; точная деформация контура — позже). */
  readonly mountGapMm: number;
  readonly layoutMode: FloorInsulationLayoutMode;
}

/**
 * Снимок профиля на момент генерации (спецификация и отображение, если профиль удалён).
 */
export interface FloorInsulationSpecSnapshot {
  readonly profileName: string;
  /** null — старый импорт без профиля. */
  readonly profileId: string | null;
  readonly materialLabel: string;
  readonly sheetLengthMm: number;
  readonly sheetWidthMm: number;
  readonly thicknessMm: number;
  readonly technologicalGapMm: number;
  readonly layoutMode: FloorInsulationLayoutMode;
  readonly fillColorHex2d?: string;
}

/** Один кусок утеплителя между балками (после обрезки по препятствиям). */
export interface FloorInsulationPiece {
  readonly id: string;
  readonly layerId: string;
  /** Внешний контур в плане (мм), CCW. */
  readonly outlineRingMm: readonly Point2D[];
  readonly thicknessMm: number;
  /** Низ куска по Z (мм от нуля проекта). */
  readonly baseElevationMm: number;
  readonly specSnapshot: FloorInsulationSpecSnapshot;
  /** true, если кусок совпадает с целым листом (без подрезки по площади). */
  readonly isFullSheet: boolean;
  readonly areaMm2: number;
  readonly volumeMm3: number;
  /**
   * Отпечаток балок слоя на момент генерации; при расхождении раскладка считается устаревшей.
   */
  readonly geometryFingerprint: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const DEFAULT_FLOOR_INSULATION_TEMPLATE: FloorInsulationTemplateParams = {
  materialLabel: "EPS",
  sheetLengthMm: 2400,
  sheetWidthMm: 1200,
  thicknessMm: 145,
  mountGapMm: 5,
  layoutMode: "auto",
};

/** Миграция старых файлов: было поле template, теперь specSnapshot. */
export function normalizeFloorInsulationPieceImported(raw: unknown): FloorInsulationPiece {
  const r = raw as Partial<FloorInsulationPiece> & {
    readonly template?: FloorInsulationTemplateParams;
  };
  if (r.specSnapshot) {
    const { template: _drop, ...rest } = r as FloorInsulationPiece & { template?: FloorInsulationTemplateParams };
    return rest as FloorInsulationPiece;
  }
  if (r.template) {
    const t = r.template;
    const { template: _drop2, ...rest } = r as FloorInsulationPiece & { template: FloorInsulationTemplateParams };
    return {
      ...(rest as Omit<FloorInsulationPiece, "specSnapshot">),
      specSnapshot: {
        profileName: "Импорт (без профиля)",
        profileId: null,
        materialLabel: t.materialLabel,
        sheetLengthMm: t.sheetLengthMm,
        sheetWidthMm: t.sheetWidthMm,
        thicknessMm: t.thicknessMm,
        technologicalGapMm: t.mountGapMm,
        layoutMode: t.layoutMode,
      },
    };
  }
  throw new Error("Некорректный кусок утеплителя перекрытия: нет specSnapshot и template.");
}
