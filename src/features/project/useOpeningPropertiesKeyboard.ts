import { useEffect } from "react";

import { isEditableKeyboardTarget } from "@/shared/editableKeyboardTarget";
import { useAppStore } from "@/store/useAppStore";

import { applyResolvedObjectEditor, resolveObjectEditorForSelection } from "./objectEditorActions";

/**
 * Enter → открыть редактор выбранного объекта на 2D (как кнопка «Редактировать» / двойной клик).
 */
export function useOpeningPropertiesKeyboard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Enter") {
        return;
      }
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      const {
        selectedEntityIds,
        currentProject,
        windowEditModal,
        addWindowModalOpen,
        doorEditModal,
        addDoorModalOpen,
        activeTab,
      } = useAppStore.getState();
      if (activeTab !== "2d") {
        return;
      }
      if (
        windowEditModal != null ||
        addWindowModalOpen ||
        doorEditModal != null ||
        addDoorModalOpen
      ) {
        return;
      }
      const resolved = resolveObjectEditorForSelection(selectedEntityIds, currentProject);
      if (resolved.kind === "hint") {
        return;
      }
      e.preventDefault();
      applyResolvedObjectEditor(resolved);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
