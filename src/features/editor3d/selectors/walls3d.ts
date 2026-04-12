import { getLayerById } from "@/core/domain/layerOps";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";

import { isProjectLayerVisibleIn3d } from "../view3dVisibility";

/**
 * Стены для 3D-сцены: все модельные стены, кроме тех, чей слой явно скрыт.
 * Активный слой не фильтруем — 3D показывает здание целиком.
 */
export function selectWallsForScene3d(project: Project): readonly Wall[] {
  return project.walls.filter((w) => {
    const layer = getLayerById(project, w.layerId);
    if (layer?.isVisible === false) {
      return false;
    }
    if (!isProjectLayerVisibleIn3d(w.layerId, project)) {
      return false;
    }
    return true;
  });
}
