import { useAppStore } from "@/store/useAppStore";

import "./left-nav-rail.css";

function IconFloorPlan({ active }: { readonly active: boolean }) {
  return (
    <svg className="lnr-icon" viewBox="0 0 24 24" aria-hidden="true" data-active={active}>
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
      />
    </svg>
  );
}

function IconFloorStructure({ active }: { readonly active: boolean }) {
  return (
    <svg className="lnr-icon" viewBox="0 0 24 24" aria-hidden="true" data-active={active}>
      <path
        fill="currentColor"
        d="M4 5h16v2H4V5zm0 5h16v1.5H4V10zm0 4h16v1.5H4V14zm0 4h16v2H4v-2z"
        opacity="0.88"
      />
      <path fill="currentColor" d="M4 7h16v1H4V7zm0 6h16v1H4v-1z" opacity="0.35" />
    </svg>
  );
}

function IconWallDetail({ active }: { readonly active: boolean }) {
  return (
    <svg className="lnr-icon" viewBox="0 0 24 24" aria-hidden="true" data-active={active}>
      <path fill="currentColor" d="M3 6h18v3H3V6zm0 5h18v7H3v-7zm3 2v3h4v-3H6zm6 0v3h9v-3h-9z" />
    </svg>
  );
}

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
        <IconFloorPlan active={floorPlanActive} />
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
        <IconFloorStructure active={floorStructureActive} />
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
        <IconWallDetail active={wallDetailActive} />
      </button>
    </nav>
  );
}
