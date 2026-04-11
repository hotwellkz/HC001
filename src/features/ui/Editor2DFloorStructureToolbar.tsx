import { GripHorizontal } from "lucide-react";

import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useAppStore } from "@/store/useAppStore";

import "./editor2d-plan-toolbar.css";

/** Инструменты режима «Перекрытие» на 2D-плане. */
export function Editor2DFloorStructureToolbar() {
  const openBeam = useAppStore((s) => s.openAddFloorBeamModal);
  const beamToolActive = useAppStore((s) => s.floorBeamPlacementSession != null);

  return (
    <div className="e2dpt" role="toolbar" aria-label="Перекрытие">
      <button
        type="button"
        className="e2dpt-btn"
        title={beamToolActive ? "Параметры балки (добавить ещё)" : "Добавить балку"}
        aria-label={beamToolActive ? "Параметры балки" : "Добавить балку"}
        aria-pressed={beamToolActive}
        data-active={beamToolActive}
        onClick={() => openBeam()}
      >
        <LucideToolIcon icon={GripHorizontal} className="e2dpt-icon" />
      </button>
    </div>
  );
}
