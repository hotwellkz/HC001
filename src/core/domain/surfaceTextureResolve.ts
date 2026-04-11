import type { SurfaceTextureBinding } from "./surfaceTextureBinding";
import type { SurfaceTextureState } from "./surfaceTextureState";

/**
 * Разрешить эффективную текстуру для меша: объект → слой → проект → null (цвет по умолчанию).
 */
export function resolveSurfaceTextureBinding(
  state: SurfaceTextureState,
  meshKey: string,
  layerId: string,
): SurfaceTextureBinding | null {
  const mesh = state.byMeshKey[meshKey];
  if (mesh) {
    return mesh;
  }
  const layer = state.byLayerId[layerId];
  if (layer) {
    return layer;
  }
  return state.project;
}
