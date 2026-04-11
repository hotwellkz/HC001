import type { LinearProfilePlacementMode } from "../geometry/linearPlacementGeometry";

import type { WallShapeMode } from "./wallShapeMode";

/** Настройки 2D-редактора, сохраняемые в проекте. */
export interface Editor2dSettings {
  /** Привязка линейных элементов (стена и др.) к траектории построения. */
  readonly linearPlacementMode: LinearProfilePlacementMode;
  /** Линия (одна стена) или прямоугольник (четыре стены). */
  readonly wallShapeMode: WallShapeMode;
  /** Независимые режимы магнитной привязки (пороги в px на экране). */
  readonly snapToVertex: boolean;
  readonly snapToEdge: boolean;
  readonly snapToGrid: boolean;
  /** Подписи расчётных досок (JB/EB/обвязка) на 2D-плане — только для отладки. */
  readonly debugLumberPieceLabels2d: boolean;
}

/** Настройки проекта (в т.ч. редактор), сериализуются в snapshot. */
export interface ProjectSettings {
  readonly gridStepMm: number;
  /** Видимость сетки на 2D-плане (не влияет на 3D-сцену). */
  readonly show2dGrid: boolean;
  readonly editor2d: Editor2dSettings;
}

/** Для загрузки старых файлов без editor2d и с устаревшим ключом `showGrid`. */
export type ProjectSettingsWire = Omit<ProjectSettings, "editor2d" | "show2dGrid"> & {
  readonly editor2d?: Editor2dSettings;
  /** Устаревшее имя для `show2dGrid` в JSON v1. */
  readonly showGrid?: boolean;
  readonly show2dGrid?: boolean;
};

export function normalizeProjectSettings(s: ProjectSettingsWire): ProjectSettings {
  const mode = s.editor2d?.linearPlacementMode;
  const linearPlacementMode: LinearProfilePlacementMode =
    mode === "leftEdge" || mode === "rightEdge" || mode === "center" ? mode : "center";
  const wallShapeMode: WallShapeMode = s.editor2d?.wallShapeMode === "rectangle" ? "rectangle" : "line";
  const snapToVertex = s.editor2d?.snapToVertex !== false;
  const snapToEdge = s.editor2d?.snapToEdge !== false;
  const snapToGrid = s.editor2d?.snapToGrid !== false;
  const debugLumberPieceLabels2d = s.editor2d?.debugLumberPieceLabels2d === true;
  const show2dGrid =
    typeof s.show2dGrid === "boolean" ? s.show2dGrid : typeof s.showGrid === "boolean" ? s.showGrid : true;
  return {
    gridStepMm: s.gridStepMm,
    show2dGrid,
    editor2d: {
      linearPlacementMode,
      wallShapeMode,
      snapToVertex,
      snapToEdge,
      snapToGrid,
      debugLumberPieceLabels2d,
    },
  };
}
