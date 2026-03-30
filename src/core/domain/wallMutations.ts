import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import { syncRectangleOverallDimensions } from "./rectangleWallDimensions";
import type { Wall } from "./wall";

export function replaceWallInProject(project: Project, wallId: string, next: Wall): Project {
  const t = new Date().toISOString();
  const updated = touchProjectMeta({
    ...project,
    walls: project.walls.map((w) =>
      w.id === wallId
        ? {
            ...next,
            updatedAt: t,
          }
        : w,
    ),
  });
  return syncRectangleOverallDimensions(updated);
}
