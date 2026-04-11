import type { ReactNode } from "react";

import type { SlabBuildMode } from "@/core/domain/settings";
import { useAppStore } from "@/store/useAppStore";

import "./linear-placement-rail.css";
import "./slab-placement-rail.css";

function IconSlabRect() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M5 8h14v10H5z" />
      <path fill="currentColor" d="M5 6h14v2H5V6z" opacity="0.45" />
    </svg>
  );
}

function IconSlabPolyline() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 18l4-6 4 3 6-9"
      />
      <circle cx="5" cy="18" r="1.6" fill="currentColor" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" />
      <circle cx="13" cy="15" r="1.6" fill="currentColor" />
      <circle cx="19" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}

const MODES: readonly { mode: SlabBuildMode; title: string; icon: ReactNode }[] = [
  { mode: "rectangle", title: "Плита: прямоугольник (две точки по диагонали)", icon: <IconSlabRect /> },
  { mode: "polyline", title: "Плита: полилиния по точкам", icon: <IconSlabPolyline /> },
];

/**
 * Правая панель: режим контура плиты. Видна во время активного сеанса постановки плиты.
 */
export function SlabPlacementRail() {
  const session = useAppStore((s) => s.slabPlacementSession);
  const slabMode = useAppStore((s) => s.currentProject.settings.editor2d.slabBuildMode);
  const setSlabBuildMode = useAppStore((s) => s.setSlabBuildMode);

  if (!session) {
    return null;
  }

  return (
    <aside className="lpr spr" aria-label="Режим построения плиты">
      <div className="spr-heading">Плита</div>
      <div className="lpr-group" aria-label="Контур плиты">
        {MODES.map(({ mode: m, title, icon }) => (
          <button
            key={m}
            type="button"
            className="lpr-btn"
            title={title}
            aria-label={title}
            aria-pressed={slabMode === m}
            data-active={slabMode === m}
            onClick={() => setSlabBuildMode(m)}
          >
            {icon}
          </button>
        ))}
      </div>
      <p className="spr-hint">
        {slabMode === "rectangle"
          ? "Две точки по углам прямоугольника."
          : "Точки контура · замыкание: первая точка, двойной клик или Enter."}
      </p>
    </aside>
  );
}
