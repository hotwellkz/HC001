import { BrickWall, LayoutGrid, Layers } from "lucide-react";

import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useAppStore } from "@/store/useAppStore";

import "./left-nav-rail.css";

/** Вертикальная навигация по режимам рабочей области. */
export function LeftNavRail() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const planScope = useAppStore((s) => s.currentProject.viewState.editor2dPlanScope);
  const setEditor2dPlanScope = useAppStore((s) => s.setEditor2dPlanScope);
  const openWallDetail = useAppStore((s) => s.openWallDetail);
  const selectedWallId = useAppStore((s) => {
    const sel = new Set(s.selectedEntityIds);
    return s.currentProject.walls.find((w) => sel.has(w.id))?.id ?? null;
  });
  const floorPlanActive = activeTab === "2d" && planScope === "main";
  const floorStructureActive = activeTab === "2d" && planScope === "floorStructure";
  const wallDetailActive = activeTab === "wall";

  return (
    <nav className="lnr" aria-label="Режим работы">
      <button
        type="button"
        className="lnr-btn"
        title="План этажа"
        aria-label="План этажа"
        aria-pressed={floorPlanActive}
        data-active={floorPlanActive}
        onClick={() => {
          setActiveTab("2d");
          setEditor2dPlanScope("main");
        }}
      >
        <LucideToolIcon icon={LayoutGrid} className="lnr-icon" />
      </button>
      <button
        type="button"
        className="lnr-btn"
        title="Перекрытие"
        aria-label="Перекрытие"
        aria-pressed={floorStructureActive}
        data-active={floorStructureActive}
        onClick={() => {
          setActiveTab("2d");
          setEditor2dPlanScope("floorStructure");
        }}
      >
        <LucideToolIcon icon={Layers} className="lnr-icon" />
      </button>
      <button
        type="button"
        className="lnr-btn"
        title={selectedWallId ? "Вид стены" : "Выберите стену на плане"}
        aria-label="Вид стены"
        aria-pressed={wallDetailActive}
        data-active={wallDetailActive}
        disabled={!selectedWallId}
        onClick={() => {
          if (selectedWallId) openWallDetail(selectedWallId);
        }}
      >
        <LucideToolIcon icon={BrickWall} className="lnr-icon" />
      </button>
    </nav>
  );
}
