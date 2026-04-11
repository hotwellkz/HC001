import { beforeEach, describe, expect, it } from "vitest";

import { createDemoProject } from "@/core/domain/demoProject";
import { initialLine2dSession } from "@/core/domain/line2dSession";
import {
  DEFAULT_VIEW_PRESET_KEY,
  DEFAULT_WINDOW_FORM_KEY,
} from "@/core/domain/windowFormCatalog";

import { useAppStore } from "./useAppStore";

describe("липкий режим размещения (store)", () => {
  beforeEach(() => {
    const p = createDemoProject();
    useAppStore.setState({
      currentProject: p,
      viewport2d: p.viewState.viewport2d,
      activeTool: "select",
      pendingWindowPlacement: null,
      pendingDoorPlacement: null,
      pendingOpeningPlacementHistoryBaseline: null,
      lastWindowPlacementParams: null,
      lastDoorPlacementParams: null,
      windowEditModal: null,
      doorEditModal: null,
      lastError: null,
    });
  });

  it("applyWindowFormModal сохраняет lastWindowPlacementParams", () => {
    const input = {
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 900,
      heightMm: 2100,
      viewPreset: DEFAULT_VIEW_PRESET_KEY,
      sillOverhangMm: 50,
      isEmptyOpening: false,
    };
    useAppStore.getState().applyWindowFormModal(input);
    expect(useAppStore.getState().lastWindowPlacementParams).toEqual(input);
    expect(useAppStore.getState().pendingWindowPlacement).not.toBeNull();
  });

  it("после успешной установки окна остаётся режим размещения без модалки редактирования", () => {
    useAppStore.setState({ viewportCanvas2dPx: { width: 800, height: 600 } });
    useAppStore.getState().applyWindowFormModal({
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 900,
      heightMm: 2100,
      viewPreset: DEFAULT_VIEW_PRESET_KEY,
      sillOverhangMm: 50,
      isEmptyOpening: false,
    });
    const id1 = useAppStore.getState().pendingWindowPlacement!.openingId;
    useAppStore.getState().tryCommitPendingWindowPlacementAtWorld({ x: 1000, y: 0 });
    const st = useAppStore.getState();
    expect(st.lastError).toBeNull();
    expect(st.windowEditModal).toBeNull();
    expect(st.pendingWindowPlacement).not.toBeNull();
    expect(st.pendingWindowPlacement!.openingId).not.toBe(id1);
    const windows = st.currentProject.openings.filter((o) => o.kind === "window");
    const placed = windows.filter((o) => o.wallId != null);
    const drafts = windows.filter((o) => o.wallId == null);
    expect(placed.length).toBeGreaterThanOrEqual(1);
    expect(drafts.length).toBe(1);
  });

  it("abortPendingWindowPlacement создаёт новый черновик с теми же параметрами", () => {
    useAppStore.getState().applyWindowFormModal({
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 900,
      heightMm: 2100,
      viewPreset: DEFAULT_VIEW_PRESET_KEY,
      sillOverhangMm: 50,
      isEmptyOpening: false,
    });
    const id1 = useAppStore.getState().pendingWindowPlacement!.openingId;
    useAppStore.getState().abortPendingWindowPlacement();
    const st = useAppStore.getState();
    expect(st.pendingWindowPlacement).not.toBeNull();
    expect(st.pendingWindowPlacement!.openingId).not.toBe(id1);
    expect(st.lastWindowPlacementParams?.widthMm).toBe(900);
  });

  it("смена инструмента снимает pending окна с черновиком", () => {
    useAppStore.getState().applyWindowFormModal({
      formKey: DEFAULT_WINDOW_FORM_KEY,
      widthMm: 900,
      heightMm: 2100,
      viewPreset: DEFAULT_VIEW_PRESET_KEY,
      sillOverhangMm: 50,
      isEmptyOpening: false,
    });
    const draftId = useAppStore.getState().pendingWindowPlacement!.openingId;
    useAppStore.getState().setActiveTool("line");
    const st = useAppStore.getState();
    expect(st.pendingWindowPlacement).toBeNull();
    expect(st.currentProject.openings.some((o) => o.id === draftId)).toBe(false);
  });

  it("abortPendingDoorPlacement в chooseSwing возвращает к pickWall с тем же openingId", () => {
    useAppStore.setState({ viewportCanvas2dPx: { width: 800, height: 600 } });
    useAppStore.getState().applyDoorFormModal({
      widthMm: 900,
      heightMm: 2100,
      isEmptyOpening: false,
      doorType: "single",
      doorSwing: "in_right",
      doorTrimMm: 50,
    });
    const id = useAppStore.getState().pendingDoorPlacement!.openingId;
    useAppStore.getState().tryCommitPendingDoorPlacementAtWorld({ x: 8000, y: 4500 });
    expect(useAppStore.getState().pendingDoorPlacement?.phase).toBe("chooseSwing");
    useAppStore.getState().abortPendingDoorPlacement();
    expect(useAppStore.getState().pendingDoorPlacement).toEqual({
      openingId: id,
      phase: "pickWall",
    });
  });

  it("line2dCancel не переключает activeTool на select", () => {
    useAppStore.setState({ activeTool: "line", line2dSession: initialLine2dSession() });
    useAppStore.getState().line2dCancel();
    expect(useAppStore.getState().activeTool).toBe("line");
  });
});
