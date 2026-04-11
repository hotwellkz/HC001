import { duplicateFloorBeamInProject, translateFloorBeamsInProject } from "./floorBeamOps";
import { duplicateFoundationPileInProject, translateFoundationPilesInProject } from "./foundationPileOps";
import type { EntityCopyTarget } from "./entityCopySession";
import { duplicatePlanLineInProject } from "./planLine";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import { duplicateOpeningOnSameWall, duplicateWallWithDependents } from "./wallDuplicate";
import { duplicateSlabInProject, translateSlabsInProjectByIds } from "./slabOps";
import { translateWallInProject } from "./wallTranslate";
import { cloneFoundationStripEntityNewId, translateFoundationStripsInProjectByIds } from "./foundationStripTranslate";
import { distanceAlongWallAxisFromStartUnclampedMm } from "./wallCalculationGeometry";
import { repositionPlacedWindowLeftEdge } from "./openingWindowMutations";
import { repositionPlacedDoorLeftEdge } from "./openingDoorMutations";
import type { Point2D } from "../geometry/types";

function translatePlanLinesInProjectByIds(
  project: Project,
  lineIds: ReadonlySet<string>,
  dxMm: number,
  dyMm: number,
): Project {
  const planLines = project.planLines.map((l) =>
    lineIds.has(l.id)
      ? {
          ...l,
          start: { x: l.start.x + dxMm, y: l.start.y + dyMm },
          end: { x: l.end.x + dxMm, y: l.end.y + dyMm },
        }
      : l,
  );
  return touchProjectMeta({ ...project, planLines });
}

/**
 * Создаёт копии сущности так, что точка привязки каждой копии совпадает с соответствующей целевой точкой.
 */
export function applyEntityCopyWithAnchorTargets(
  project: Project,
  target: EntityCopyTarget,
  worldAnchorStart: Point2D,
  anchorTargetWorldPoints: readonly Point2D[],
  openingAnchorAlongWallMm: number | null,
): { readonly project: Project; readonly newEntityIds: readonly string[] } | { readonly error: string } {
  if (anchorTargetWorldPoints.length === 0) {
    return { error: "Нет позиций для копий." };
  }

  let proj = project;
  const newIds: string[] = [];

  if (target.kind === "wall") {
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const r = duplicateWallWithDependents(proj, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      proj = translateWallInProject(r.project, r.newWallId, dx, dy);
      newIds.push(r.newWallId);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  if (target.kind === "foundationPile") {
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const r = duplicateFoundationPileInProject(proj, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      proj = translateFoundationPilesInProject(r.project, new Set([r.newPileId]), dx, dy);
      newIds.push(r.newPileId);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  if (target.kind === "floorBeam") {
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const r = duplicateFloorBeamInProject(proj, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      proj = translateFloorBeamsInProject(r.project, new Set([r.newBeamId]), dx, dy);
      newIds.push(r.newBeamId);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  if (target.kind === "planLine") {
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const r = duplicatePlanLineInProject(proj, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      proj = translatePlanLinesInProjectByIds(r.project, new Set([r.newLineId]), dx, dy);
      newIds.push(r.newLineId);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  if (target.kind === "foundationStrip") {
    const src = proj.foundationStrips.find((s) => s.id === target.id);
    if (!src) {
      return { error: "Лента фундамента не найдена." };
    }
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const clone = cloneFoundationStripEntityNewId(src);
      proj = touchProjectMeta({ ...proj, foundationStrips: [...proj.foundationStrips, clone] });
      proj = translateFoundationStripsInProjectByIds(proj, new Set([clone.id]), dx, dy);
      newIds.push(clone.id);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  if (target.kind === "slab") {
    let projAcc = proj;
    for (const pt of anchorTargetWorldPoints) {
      const dx = pt.x - worldAnchorStart.x;
      const dy = pt.y - worldAnchorStart.y;
      const r = duplicateSlabInProject(projAcc, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      projAcc = translateSlabsInProjectByIds(r.project, new Set([r.newSlabId]), dx, dy);
      newIds.push(r.newSlabId);
    }
    return { project: touchProjectMeta(projAcc), newEntityIds: newIds };
  }

  if (target.kind === "opening") {
    const o0 = proj.openings.find((x) => x.id === target.id);
    if (!o0 || o0.wallId == null || o0.offsetFromStartMm == null) {
      return { error: "Проём не на стене." };
    }
    const wall = proj.walls.find((w) => w.id === o0.wallId);
    if (!wall) {
      return { error: "Стена проёма не найдена." };
    }
    if (openingAnchorAlongWallMm == null || !Number.isFinite(openingAnchorAlongWallMm)) {
      return { error: "Нет привязки проёма вдоль стены." };
    }
    const left0 = o0.offsetFromStartMm;
    const s0 = openingAnchorAlongWallMm;
    for (const pt of anchorTargetWorldPoints) {
      const si = distanceAlongWallAxisFromStartUnclampedMm(wall, pt);
      const newLeft = left0 + (si - s0);
      const r = duplicateOpeningOnSameWall(proj, target.id);
      if ("error" in r) {
        return { error: r.error };
      }
      proj = r.project;
      const nid = r.newOpeningId;
      if (o0.kind === "window") {
        const mv = repositionPlacedWindowLeftEdge(proj, nid, newLeft);
        if ("error" in mv) {
          return { error: mv.error };
        }
        proj = mv.project;
      } else if (o0.kind === "door") {
        const mv = repositionPlacedDoorLeftEdge(proj, nid, newLeft);
        if ("error" in mv) {
          return { error: mv.error };
        }
        proj = mv.project;
      } else {
        return { error: "Копирование этого типа проёма пока не поддерживается." };
      }
      newIds.push(nid);
    }
    return { project: touchProjectMeta(proj), newEntityIds: newIds };
  }

  return { error: "Неизвестный тип объекта." };
}
