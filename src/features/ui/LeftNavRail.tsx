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
  const openWallDetail = useAppStore((s) => s.openWallDetail);
  const selectedWallId = useAppStore((s) => {
    const sel = new Set(s.selectedEntityIds);
    return s.currentProject.walls.find((w) => sel.has(w.id))?.id ?? null;
  });
  const floorPlanActive = activeTab === "2d";
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
        onClick={() => setActiveTab("2d")}
      >
        <IconFloorPlan active={floorPlanActive} />
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
