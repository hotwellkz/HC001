export type EditorTab = "2d" | "3d";

export interface ViewportState2D {
  readonly panXMm: number;
  readonly panYMm: number;
  /** Пикселей на мм. */
  readonly zoomPixelsPerMm: number;
}

export interface ViewportState3D {
  readonly polarAngle: number;
  readonly azimuthalAngle: number;
  readonly distance: number;
  readonly targetXMm: number;
  readonly targetYMm: number;
  readonly targetZMm: number;
}

export interface ViewState {
  readonly activeTab: EditorTab;
  readonly viewport2d: ViewportState2D;
  readonly viewport3d: ViewportState3D;
  /** Узкий rail вместо полной панели «Свойства» (сохраняется в проекте). */
  readonly rightPropertiesCollapsed: boolean;
  /**
   * true: layered-профили в 3D как отдельные объёмы по слоям.
   * false: одна «сплошная» стена (упрощённо, меньше мешей).
   */
  readonly show3dProfileLayers: boolean;
  /**
   * true: layered-профили на 2D-плане как полосы по толщине (при достаточном zoom).
   * false: одна полоса как раньше.
   */
  readonly show2dProfileLayers: boolean;
}

/** Нормализация viewState из файла (старые проекты без поля). */
export function normalizeViewState(
  input: Pick<ViewState, "activeTab" | "viewport2d" | "viewport3d"> & {
    readonly rightPropertiesCollapsed?: boolean;
    readonly show3dProfileLayers?: boolean;
    readonly show2dProfileLayers?: boolean;
  },
): ViewState {
  return {
    activeTab: input.activeTab,
    viewport2d: input.viewport2d,
    viewport3d: input.viewport3d,
    rightPropertiesCollapsed: input.rightPropertiesCollapsed === true,
    show3dProfileLayers: input.show3dProfileLayers !== false,
    show2dProfileLayers: input.show2dProfileLayers !== false,
  };
}
