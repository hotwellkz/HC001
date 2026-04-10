import type { Opening } from "./opening";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import { isOpeningPlacedOnWall } from "./opening";
import { distanceAlongWallFromStartMm } from "./wallCalculationGeometry";
import { repositionPlacedDoorLeftEdge } from "./openingDoorMutations";
import { repositionPlacedWindowLeftEdge } from "./openingWindowMutations";
import { clampPlacedOpeningLeftEdgeMm, validateWindowPlacementOnWall } from "./openingWindowGeometry";
import { wallPointAtAlongFromStartMm } from "./openingPlacement";
import type { WallEndSide } from "./wallJoint";
import { replaceWallInProject } from "./wallMutations";
import { wallWithMovedEndAtLength } from "./wallLengthChangeGeometry";
import { recalculateWallCalculationIfPresent } from "./wallCalculationRecalc";

function collectPlacedOpeningsOnWall(project: Project, wallId: string): Opening[] {
  return project.openings.filter((o) => o.wallId === wallId && isOpeningPlacedOnWall(o));
}

/**
 * Проверяет, можно ли применить новую длину: проёмы остаются в допустимых пределах после пересчёта привязки.
 */
export function validateWallLengthChangeWithOpenings(
  project: Project,
  wallId: string,
  movingEnd: WallEndSide,
  newLengthMm: number,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const wall = project.walls.find((w) => w.id === wallId);
  if (!wall) {
    return { ok: false, reason: "Стена не найдена." };
  }
  const candidate = wallWithMovedEndAtLength(wall, movingEnd, newLengthMm);
  if (!candidate) {
    return { ok: false, reason: "Некорректная геометрия стены." };
  }
  let p: Project = {
    ...project,
    walls: project.walls.map((w) => (w.id === wallId ? candidate : w)),
  };
  const onWall = collectPlacedOpeningsOnWall(project, wallId);
  for (const o of onWall) {
    const worldLeft = wallPointAtAlongFromStartMm(wall, o.offsetFromStartMm!);
    const newLeft = distanceAlongWallFromStartMm(candidate, worldLeft);
    if (o.kind === "window") {
      const r = repositionPlacedWindowLeftEdge(p, o.id, newLeft);
      if ("error" in r) {
        return { ok: false, reason: r.error };
      }
      p = r.project;
    } else if (o.kind === "door") {
      const r = repositionPlacedDoorLeftEdge(p, o.id, newLeft);
      if ("error" in r) {
        return { ok: false, reason: r.error };
      }
      p = r.project;
    } else {
      const w2 = p.walls.find((w) => w.id === wallId);
      if (!w2) {
        return { ok: false, reason: "Стена не найдена." };
      }
      const clamped = clampPlacedOpeningLeftEdgeMm(w2, o.widthMm, newLeft, p, "other");
      const v = validateWindowPlacementOnWall(w2, clamped, o.widthMm, p, o.id, { openingKind: "other" });
      if (!v.ok) {
        return { ok: false, reason: v.reason };
      }
      p = touchProjectMeta({
        ...p,
        openings: p.openings.map((op) => (op.id === o.id ? { ...op, offsetFromStartMm: clamped } : op)),
      });
    }
  }
  return { ok: true };
}

/**
 * Применяет изменение длины стены, сохраняет положение проёмов в мире и пересчитывает расчёт стены при наличии.
 */
export function applyWallLengthChangeInProject(
  project: Project,
  wallId: string,
  movingEnd: WallEndSide,
  newLengthMm: number,
): { readonly project: Project } | { readonly error: string } {
  const v = validateWallLengthChangeWithOpenings(project, wallId, movingEnd, newLengthMm);
  if (!v.ok) {
    return { error: v.reason };
  }
  const wall = project.walls.find((w) => w.id === wallId);
  if (!wall) {
    return { error: "Стена не найдена." };
  }
  const candidate = wallWithMovedEndAtLength(wall, movingEnd, newLengthMm);
  if (!candidate) {
    return { error: "Некорректная геометрия стены." };
  }
  let p = replaceWallInProject(project, wallId, candidate);
  const onWall = collectPlacedOpeningsOnWall(project, wallId);
  for (const o of onWall) {
    const worldLeft = wallPointAtAlongFromStartMm(wall, o.offsetFromStartMm!);
    const wCur = p.walls.find((w) => w.id === wallId)!;
    const newLeft = distanceAlongWallFromStartMm(wCur, worldLeft);
    if (o.kind === "window") {
      const r = repositionPlacedWindowLeftEdge(p, o.id, newLeft);
      if ("error" in r) {
        return { error: r.error };
      }
      p = r.project;
    } else if (o.kind === "door") {
      const r = repositionPlacedDoorLeftEdge(p, o.id, newLeft);
      if ("error" in r) {
        return { error: r.error };
      }
      p = r.project;
    } else {
      const w2 = p.walls.find((w) => w.id === wallId)!;
      const clamped = clampPlacedOpeningLeftEdgeMm(w2, o.widthMm, newLeft, p, "other");
      const openings = p.openings.map((op) =>
        op.id === o.id
          ? {
              ...op,
              offsetFromStartMm: clamped,
              updatedAt: new Date().toISOString(),
            }
          : op,
      );
      p = touchProjectMeta({ ...p, openings });
    }
  }
  p = recalculateWallCalculationIfPresent(p, wallId);
  return { project: p };
}
