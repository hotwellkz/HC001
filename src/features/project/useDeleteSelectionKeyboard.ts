import { useEffect } from "react";

import { isEditableKeyboardTarget } from "@/shared/editableKeyboardTarget";
import { useAppStore } from "@/store/useAppStore";

import { projectCommands } from "./commands";

/**
 * Delete / Backspace → то же удаление, что и кнопка «корзина» (`projectCommands.deleteSelected`).
 * Снимается при unmount. Не дублирует бизнес-логику.
 */
export function useDeleteSelectionKeyboard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Delete" && e.key !== "Backspace") {
        return;
      }
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      const { selectedEntityIds } = useAppStore.getState();
      if (selectedEntityIds.length === 0) {
        return;
      }
      e.preventDefault();
      projectCommands.deleteSelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
