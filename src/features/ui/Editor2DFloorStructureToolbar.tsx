import { useAppStore } from "@/store/useAppStore";

import "./editor2d-plan-toolbar.css";

function IconFloorBeam() {
  return (
    <svg className="e2dpt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 10h18v4H3v-4zm2-2h14v2H5V8zm0 8h14v2H5v-2z"
        opacity="0.85"
      />
      <path fill="currentColor" d="M4 11h16v2H4v-2z" opacity="0.35" />
    </svg>
  );
}

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
        <IconFloorBeam />
      </button>
    </div>
  );
}
