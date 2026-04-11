import type { Project } from "@/core/domain/project";
import { narrowProjectToActiveLayer } from "@/core/domain/projectLayerSlice";

/** Согласовано с {@link import("@/store/useAppStore").ActiveTool}. */
export type SelectAllActiveTool = "select" | "pan" | "ruler" | "changeLength" | "line";

export interface SelectAllEditorSnapshot {
  readonly activeTool: SelectAllActiveTool;
  readonly activeTab: string;
  readonly wallPlacementSession: unknown | null;
  readonly pendingWindowPlacement: unknown | null;
  readonly pendingDoorPlacement: unknown | null;
  readonly addWindowModalOpen: boolean;
  readonly addDoorModalOpen: boolean;
}

/**
 * Какие id выделить по Ctrl/Cmd+A в контексте 2D-плана (активный слой).
 * Без if-цепочки в UI: таблица режимов сводится к этой функции.
 */
export function entityIdsForSelectAll2d(project: Project, snap: SelectAllEditorSnapshot): readonly string[] {
  if (snap.activeTab !== "2d") {
    return [];
  }
  const layerView = narrowProjectToActiveLayer(project);

  if (snap.activeTool === "line") {
    return layerView.planLines.map((l) => l.id);
  }

  if (snap.wallPlacementSession) {
    return layerView.walls.map((w) => w.id);
  }

  const windowMode =
    snap.pendingWindowPlacement != null || snap.addWindowModalOpen;
  if (windowMode) {
    return layerView.openings.filter((o) => o.kind === "window" && o.wallId != null).map((o) => o.id);
  }

  const doorMode = snap.pendingDoorPlacement != null || snap.addDoorModalOpen;
  if (doorMode) {
    return layerView.openings.filter((o) => o.kind === "door" && o.wallId != null).map((o) => o.id);
  }

  const allSelectable =
    snap.activeTool === "select" ||
    snap.activeTool === "pan" ||
    snap.activeTool === "ruler" ||
    snap.activeTool === "changeLength";

  if (!allSelectable) {
    return [];
  }

  const ids: string[] = [];
  for (const w of layerView.walls) {
    ids.push(w.id);
  }
  for (const o of layerView.openings) {
    if (o.wallId != null) {
      ids.push(o.id);
    }
  }
  for (const l of layerView.planLines) {
    ids.push(l.id);
  }
  return ids;
}
