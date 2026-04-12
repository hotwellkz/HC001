import type { FloorInsulationPiece } from "./floorInsulation";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

export function removeFloorInsulationForLayers(project: Project, layerIds: ReadonlySet<string>): Project {
  if (layerIds.size === 0) {
    return project;
  }
  const next = project.floorInsulationPieces.filter((p) => !layerIds.has(p.layerId));
  if (next.length === project.floorInsulationPieces.length) {
    return project;
  }
  return touchProjectMeta({ ...project, floorInsulationPieces: next });
}

export function replaceFloorInsulationPiecesForLayer(
  project: Project,
  layerId: string,
  pieces: readonly FloorInsulationPiece[],
): Project {
  const rest = project.floorInsulationPieces.filter((p) => p.layerId !== layerId);
  return touchProjectMeta({
    ...project,
    floorInsulationPieces: [...rest, ...pieces],
  });
}

/** Добавить новые куски к уже существующим на том же слое (несколько областей подряд). */
export function appendFloorInsulationPiecesForLayer(
  project: Project,
  layerId: string,
  newPieces: readonly FloorInsulationPiece[],
): Project {
  const rest = project.floorInsulationPieces.filter((p) => p.layerId !== layerId);
  const kept = project.floorInsulationPieces.filter((p) => p.layerId === layerId);
  return touchProjectMeta({
    ...project,
    floorInsulationPieces: [...rest, ...kept, ...newPieces],
  });
}

export function clearFloorInsulationForLayer(project: Project, layerId: string): Project {
  return replaceFloorInsulationPiecesForLayer(project, layerId, []);
}
