import type { Editor3dPickKind } from "./editor3dPickPayload";
import type { SurfaceTextureBinding } from "./surfaceTextureBinding";

/**
 * Иерархия: byMeshKey → byLayerId → project → дефолтный цвет материала.
 * Сброс на уровне слоя/проекта удаляет только соответствующий override.
 */
export interface SurfaceTextureState {
  /** Базовая текстура для всего проекта (ниже приоритетом, чем слой и объект). */
  readonly project: SurfaceTextureBinding | null;
  readonly byLayerId: Readonly<Record<string, SurfaceTextureBinding>>;
  readonly byMeshKey: Readonly<Record<string, SurfaceTextureBinding>>;
}

export const EMPTY_SURFACE_TEXTURE_STATE: SurfaceTextureState = {
  project: null,
  byLayerId: {},
  byMeshKey: {},
};

export function surfaceTextureMeshKey(kind: Editor3dPickKind, reactKey: string): string {
  return `${kind}::${reactKey}`;
}
