import { newEntityId } from "./ids";
import type { Opening } from "./opening";
import type { OpeningFramingPiece } from "./openingFramingPiece";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import { getProfileById } from "./profileOps";
import { createWallEntity } from "./wallOps";
import { allocateNextWallMarks } from "./wallMarking";
import {
  buildPieceMark,
  buildSipPanelPieceMark,
  normalizeLumberRole,
  type WallCalculationResult,
} from "./wallCalculation";
import { nextWindowSequenceNumber } from "./openingWindowMutations";
import { nextDoorSequenceNumber } from "./openingDoorMutations";

function nowIso(): string {
  return new Date().toISOString();
}

function remapWallCalculation(calc: WallCalculationResult, newWallId: string, newWallMark: string): WallCalculationResult {
  const newCalcId = newEntityId();
  const generatedAt = new Date().toISOString();
  return {
    ...calc,
    id: newCalcId,
    wallId: newWallId,
    generatedAt,
    sipRegions: calc.sipRegions.map((r) => ({
      ...r,
      id: newEntityId(),
      wallId: newWallId,
      calculationId: newCalcId,
      pieceMark: buildSipPanelPieceMark(newWallMark, r.index),
    })),
    lumberPieces: calc.lumberPieces.map((lp) => ({
      ...lp,
      id: newEntityId(),
      wallId: newWallId,
      calculationId: newCalcId,
      wallMark: newWallMark,
      pieceMark: buildPieceMark(newWallMark, normalizeLumberRole(lp.role), lp.sequenceNumber),
    })),
  };
}

function cloneOpeningForWall(
  o: Opening,
  newId: string,
  newWallId: string,
  project: Project,
): Opening {
  const t = nowIso();
  if (o.kind === "window") {
    const seq = nextWindowSequenceNumber(project);
    const mark = `ОК-${seq}`;
    return {
      ...o,
      id: newId,
      wallId: newWallId,
      windowSequenceNumber: seq,
      markLabel: mark,
      createdAt: o.createdAt ?? t,
      updatedAt: t,
    };
  }
  if (o.kind === "door") {
    const seq = nextDoorSequenceNumber(project);
    const mark = `Д-${seq}`;
    return {
      ...o,
      id: newId,
      wallId: newWallId,
      doorSequenceNumber: seq,
      markLabel: mark,
      createdAt: o.createdAt ?? t,
      updatedAt: t,
    };
  }
  return {
    ...o,
    id: newId,
    wallId: newWallId,
    createdAt: o.createdAt ?? t,
    updatedAt: t,
  };
}

/**
 * Полная копия стены на том же месте: новая стена, новые id у проёмов и обрамления, новая марка, пересобранный расчёт.
 */
export function duplicateWallWithDependents(project: Project, wallId: string): { readonly project: Project; readonly newWallId: string } | { readonly error: string } {
  const wall = project.walls.find((w) => w.id === wallId);
  if (!wall || !wall.profileId) {
    return { error: "Стена не найдена или без профиля." };
  }
  const prof = getProfileById(project, wall.profileId);
  if (!prof) {
    return { error: "Профиль стены не найден." };
  }
  const marks = allocateNextWallMarks(project, prof, 1);
  const mark = marks[0];
  if (!mark) {
    return { error: "Не удалось выделить марку для копии." };
  }

  const newWall = createWallEntity({
    layerId: wall.layerId,
    profileId: wall.profileId,
    start: { x: wall.start.x, y: wall.start.y },
    end: { x: wall.end.x, y: wall.end.y },
    thicknessMm: wall.thicknessMm,
    heightMm: wall.heightMm,
    baseElevationMm: wall.baseElevationMm ?? 0,
    markPrefix: mark.markPrefix,
    markSequenceNumber: mark.markSequenceNumber,
    markLabel: mark.markLabel,
  });
  if (!newWall) {
    return { error: "Не удалось создать копию стены." };
  }

  const newWallId = newWall.id;
  const newWallMark = newWall.markLabel?.trim() || mark.markLabel;

  const openingsOnWall = project.openings.filter((o) => o.wallId === wallId && o.offsetFromStartMm != null);
  const oldToNewOpening = new Map<string, string>();
  for (const o of openingsOnWall) {
    oldToNewOpening.set(o.id, newEntityId());
  }

  let nextProject: Project = {
    ...project,
    walls: [...project.walls, newWall],
  };

  for (const o of openingsOnWall) {
    const nid = oldToNewOpening.get(o.id);
    if (!nid) continue;
    const cloned = cloneOpeningForWall(o, nid, newWallId, nextProject);
    nextProject = {
      ...nextProject,
      openings: [...nextProject.openings, cloned],
    };
  }

  const framing = project.openingFramingPieces.filter((p) => p.wallId === wallId);
  const newFraming: OpeningFramingPiece[] = framing.flatMap((p) => {
    const newOpId = oldToNewOpening.get(p.openingId);
    if (!newOpId) {
      return [];
    }
    return [
      {
        ...p,
        id: newEntityId(),
        wallId: newWallId,
        openingId: newOpId,
      },
    ];
  });

  const calc = project.wallCalculations.find((c) => c.wallId === wallId);
  const wallCalculations = calc
    ? [...project.wallCalculations, remapWallCalculation(calc, newWallId, newWallMark)]
    : project.wallCalculations;

  return {
    project: touchProjectMeta({
      ...nextProject,
      openingFramingPieces: [...nextProject.openingFramingPieces, ...newFraming],
      wallCalculations,
    }),
    newWallId,
  };
}
