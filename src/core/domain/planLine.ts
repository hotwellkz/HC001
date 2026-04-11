import type { Point2D } from "../geometry/types";
import { newEntityId } from "./ids";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

/** Вспомогательный линейный объект 2D-плана (не стена, не участвует в 3D/расчётах). */
export interface PlanLine {
  readonly id: string;
  readonly layerId: string;
  readonly start: Point2D;
  readonly end: Point2D;
}

/** Минимальная длина отрезка (мм), чтобы не создавать вырожденные линии. */
export const MIN_PLAN_LINE_LENGTH_MM = 5;

export function duplicatePlanLineInProject(
  project: Project,
  lineId: string,
): { readonly project: Project; readonly newLineId: string } | { readonly error: string } {
  const ln = project.planLines.find((l) => l.id === lineId);
  if (!ln) {
    return { error: "Линия не найдена." };
  }
  const newLineId = newEntityId();
  const copy: PlanLine = {
    ...ln,
    id: newLineId,
    start: { x: ln.start.x, y: ln.start.y },
    end: { x: ln.end.x, y: ln.end.y },
  };
  return {
    project: touchProjectMeta({ ...project, planLines: [...project.planLines, copy] }),
    newLineId,
  };
}
