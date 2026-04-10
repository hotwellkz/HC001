import type { Point2D } from "../geometry/types";
import type { Project } from "./project";
import type { WallJoint } from "./wallJoint";
import { touchProjectMeta } from "./projectFactory";

function nowIso(): string {
  return new Date().toISOString();
}

function shiftJoint(j: WallJoint, wallId: string, dx: number, dy: number): WallJoint {
  if (j.kind !== "T_ABUTMENT" || j.wallBId !== wallId || !j.teePointOnMainMm) {
    return j;
  }
  const p = j.teePointOnMainMm;
  return {
    ...j,
    teePointOnMainMm: { x: p.x + dx, y: p.y + dy },
  };
}

/**
 * Жёсткий перенос стены на (dx, dy) в мм: ось и проёмы вдоль оси не меняются.
 * Точка Т-узла на оси основной стены (если эта стена — main) сдвигается вместе с геометрией.
 */
export function translateWallInProject(project: Project, wallId: string, dx: number, dy: number): Project {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)) {
    return project;
  }
  const d: Point2D = { x: dx, y: dy };
  const walls = project.walls.map((w) =>
    w.id === wallId
      ? {
          ...w,
          start: { x: w.start.x + d.x, y: w.start.y + d.y },
          end: { x: w.end.x + d.x, y: w.end.y + d.y },
          updatedAt: nowIso(),
        }
      : w,
  );
  const wallJoints = project.wallJoints.map((j) => shiftJoint(j, wallId, dx, dy));
  return touchProjectMeta({
    ...project,
    walls,
    wallJoints,
  });
}
