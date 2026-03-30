export type EditorTab = "2d" | "3d" | "spec";

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
  /**
   * true: в 3D показывать объёмы из расчёта (SIP-панели, пиломатериалы).
   * false: только геометрия стен по профилю.
   */
  readonly show3dCalculation: boolean;
}

/** Нормализация viewState из файла (старые проекты без поля). */
const VALID_TABS: readonly EditorTab[] = ["2d", "3d", "spec"];

export function normalizeViewState(
  input: Pick<ViewState, "activeTab" | "viewport2d" | "viewport3d"> & {
    readonly rightPropertiesCollapsed?: boolean;
    readonly show3dProfileLayers?: boolean;
    readonly show2dProfileLayers?: boolean;
    readonly show3dCalculation?: boolean;
  },
): ViewState {
  const tab = VALID_TABS.includes(input.activeTab as EditorTab) ? input.activeTab : "2d";
  return {
    activeTab: tab,
    viewport2d: input.viewport2d,
    viewport3d: input.viewport3d,
    rightPropertiesCollapsed: input.rightPropertiesCollapsed === true,
    show3dProfileLayers: input.show3dProfileLayers !== false,
    show2dProfileLayers: input.show2dProfileLayers !== false,
    show3dCalculation: input.show3dCalculation !== false,
  };
}
