import { newEntityId } from "./ids";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import type { Opening } from "./opening";
import type { WindowFormKey, WindowViewPresetKey } from "./windowFormCatalog";
import {
  DEFAULT_SILL_OVERHANG_MM,
  DEFAULT_VIEW_PRESET_KEY,
  DEFAULT_WINDOW_FORM_KEY,
  windowFormName,
} from "./windowFormCatalog";

export interface AddWindowDraftPayload {
  readonly formKey: WindowFormKey;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly viewPreset: WindowViewPresetKey;
  readonly sillOverhangMm: number;
  readonly isEmptyOpening: boolean;
}

export interface AddDoorDraftPayload {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly isEmptyOpening: boolean;
  readonly doorType: "single";
  readonly doorSwing: "in_right" | "in_left" | "out_right" | "out_left";
  readonly doorTrimMm: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Добавляет в проект сущность окна без привязки к стене (этап 1).
 */
export function addUnplacedWindowToProject(project: Project, draft: AddWindowDraftPayload): { project: Project; openingId: string } {
  const t = nowIso();
  const id = newEntityId();
  const formKey = draft.formKey;
  const opening: Opening = {
    id,
    wallId: null,
    kind: "window",
    offsetFromStartMm: null,
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    formKey,
    formName: windowFormName(formKey),
    isEmptyOpening: draft.isEmptyOpening,
    viewPreset: draft.viewPreset,
    sillOverhangMm: draft.sillOverhangMm,
    createdAt: t,
    updatedAt: t,
  };
  return {
    project: touchProjectMeta({
      ...project,
      openings: [...project.openings, opening],
    }),
    openingId: id,
  };
}

export function addUnplacedDoorToProject(project: Project, draft: AddDoorDraftPayload): { project: Project; openingId: string } {
  const t = nowIso();
  const id = newEntityId();
  const opening: Opening = {
    id,
    wallId: null,
    kind: "door",
    offsetFromStartMm: null,
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    isEmptyOpening: draft.isEmptyOpening,
    doorType: draft.doorType,
    doorSwing: draft.doorSwing,
    doorTrimMm: draft.doorTrimMm,
    createdAt: t,
    updatedAt: t,
  };
  return {
    project: touchProjectMeta({
      ...project,
      openings: [...project.openings, opening],
    }),
    openingId: id,
  };
}

/** Параметры следующего черновика окна из уже размещённого проёма (липкие вставки). */
export function placedWindowOpeningToDraftPayload(o: Opening): AddWindowDraftPayload | null {
  if (o.kind !== "window") {
    return null;
  }
  return {
    formKey: o.formKey ?? DEFAULT_WINDOW_FORM_KEY,
    widthMm: o.widthMm,
    heightMm: o.heightMm,
    viewPreset: o.viewPreset ?? DEFAULT_VIEW_PRESET_KEY,
    sillOverhangMm: o.sillOverhangMm ?? DEFAULT_SILL_OVERHANG_MM,
    isEmptyOpening: o.isEmptyOpening === true,
  };
}

/** Параметры следующего черновика двери из уже размещённого проёма (липкие вставки). */
export function placedDoorOpeningToDraftPayload(o: Opening): AddDoorDraftPayload | null {
  if (o.kind !== "door") {
    return null;
  }
  return {
    widthMm: o.widthMm,
    heightMm: o.heightMm,
    isEmptyOpening: o.isEmptyOpening === true,
    doorType: o.doorType ?? "single",
    doorSwing: o.doorSwing ?? "in_right",
    doorTrimMm: o.doorTrimMm ?? 50,
  };
}
