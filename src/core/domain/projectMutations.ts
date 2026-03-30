import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

/**
 * Удаляет сущности по id из проекта; стены и проёмы — каскадно (проём на удалённой стене тоже удаляется).
 */
export function deleteEntitiesFromProject(project: Project, selectedIds: ReadonlySet<string>): Project {
  const wallsKept = project.walls.filter((w) => !selectedIds.has(w.id));
  const keptWallIds = new Set(wallsKept.map((w) => w.id));
  const removedWallIds = new Set(project.walls.filter((w) => selectedIds.has(w.id)).map((w) => w.id));
  const wallCalculationsKept = project.wallCalculations.filter((c) => keptWallIds.has(c.wallId));
  const wallJointsKept = project.wallJoints.filter(
    (j) => keptWallIds.has(j.wallAId) && keptWallIds.has(j.wallBId),
  );
  const openingsKept = project.openings.filter((o) => {
    if (selectedIds.has(o.id)) {
      return false;
    }
    if (removedWallIds.has(o.wallId)) {
      return false;
    }
    return true;
  });

  const dimensionsKept = project.dimensions.filter((d) => {
    if (!d.wallIds?.length) {
      return true;
    }
    return !d.wallIds.some((id) => selectedIds.has(id));
  });

  return touchProjectMeta({
    ...project,
    walls: wallsKept,
    wallCalculations: wallCalculationsKept,
    wallJoints: wallJointsKept,
    openings: openingsKept,
    dimensions: dimensionsKept,
  });
}
