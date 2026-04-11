import type { ReactNode } from "react";

import type { LinearProfilePlacementMode } from "@/core/geometry/linearPlacementGeometry";
import type { WallShapeMode } from "@/core/domain/wallShapeMode";
import { useAppStore } from "@/store/useAppStore";

import "./linear-placement-rail.css";

function IconLine() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRect() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 7h12v10H6z" />
    </svg>
  );
}

function IconCenter() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 2a6 6 0 110 12 6 6 0 010-12zm0 2a4 4 0 100 8 4 4 0 000-8z"
      />
    </svg>
  );
}

function IconAlignLeft() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h14v2H4v-2z" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4V6zm10 5h6v2h-6v-2zM6 16h14v2H6v-2z" />
    </svg>
  );
}

const SHAPES: readonly { mode: WallShapeMode; title: string; icon: ReactNode }[] = [
  { mode: "line", title: "Линия", icon: <IconLine /> },
  { mode: "rectangle", title: "Прямоугольник", icon: <IconRect /> },
];

const MODES: readonly { mode: LinearProfilePlacementMode; title: string; icon: ReactNode }[] = [
  { mode: "center", title: "По центру", icon: <IconCenter /> },
  { mode: "leftEdge", title: "По левому краю", icon: <IconAlignLeft /> },
  { mode: "rightEdge", title: "По правому краю", icon: <IconAlignRight /> },
];

function IconSnapVertex() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 6h4v4H6V6zm8 0h4v4h-4V6zM6 14h4v4H6v-4zm8 0h4v4h-4v-4z"
        opacity="0.35"
      />
      <path fill="currentColor" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
    </svg>
  );
}

function IconSnapEdge() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M5 19L19 5" />
    </svg>
  );
}

function IconSnapGrid() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M4 8h16M4 16h16M8 4v16M16 4v16"
        opacity="0.85"
      />
    </svg>
  );
}

/** Сетка на плане (видимость), отлично от привязки к сетке: линии + условный «глаз». */
function IconGridVisibility() {
  return (
    <svg className="lpr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15M7.5 4.5v15M12 4.5v15M16.5 4.5v15"
        opacity="0.55"
      />
      <path
        fill="currentColor"
        d="M12 9.25c-2.35 0-4.45 1.28-5.6 3.25 1.15 1.97 3.25 3.25 5.6 3.25s4.45-1.28 5.6-3.25c-1.15-1.97-3.25-3.25-5.6-3.25zm0 1.5a1.75 1.75 0 110 3.5 1.75 1.75 0 010-3.5z"
      />
    </svg>
  );
}

export function LinearPlacementRail() {
  const shapeMode = useAppStore((s) => s.currentProject.settings.editor2d.wallShapeMode);
  const setShapeMode = useAppStore((s) => s.setWallShapeMode);
  const mode = useAppStore((s) => s.currentProject.settings.editor2d.linearPlacementMode);
  const setMode = useAppStore((s) => s.setLinearPlacementMode);
  const snapV = useAppStore((s) => s.currentProject.settings.editor2d.snapToVertex);
  const snapE = useAppStore((s) => s.currentProject.settings.editor2d.snapToEdge);
  const snapG = useAppStore((s) => s.currentProject.settings.editor2d.snapToGrid);
  const setSnapV = useAppStore((s) => s.setSnapToVertex);
  const setSnapE = useAppStore((s) => s.setSnapToEdge);
  const setSnapG = useAppStore((s) => s.setSnapToGrid);
  const gridVisible = useAppStore((s) => s.currentProject.settings.show2dGrid);
  const setGridVisible = useAppStore((s) => s.setShow2dGrid);
  const show2dLayers = useAppStore((s) => s.currentProject.viewState.show2dProfileLayers);
  const setShow2dProfileLayers = useAppStore((s) => s.setShow2dProfileLayers);

  return (
    <aside className="lpr" aria-label="Режимы построения стены">
      <div className="lpr-group" aria-label="Форма контура">
        {SHAPES.map(({ mode: m, title, icon }) => (
          <button
            key={m}
            type="button"
            className="lpr-btn"
            title={title}
            aria-label={title}
            aria-pressed={shapeMode === m}
            data-active={shapeMode === m}
            onClick={() => setShapeMode(m)}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className="lpr-divider" role="separator" aria-hidden="true" />
      <div className="lpr-group" aria-label="Положение по толщине">
        {MODES.map(({ mode: m, title, icon }) => (
          <button
            key={m}
            type="button"
            className="lpr-btn"
            title={title}
            aria-label={title}
            aria-pressed={mode === m}
            data-active={mode === m}
            onClick={() => setMode(m)}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className="lpr-divider" role="separator" aria-hidden="true" />
      <div className="lpr-group" aria-label="Сетка на плане">
        <button
          type="button"
          className="lpr-btn"
          title={
            gridVisible
              ? "Скрыть сетку (отображение на плане; привязка к сетке настраивается отдельно)"
              : "Показать сетку на плане"
          }
          aria-label={gridVisible ? "Скрыть сетку" : "Показать сетку"}
          aria-pressed={gridVisible}
          data-active={gridVisible}
          onClick={() => setGridVisible(!gridVisible)}
        >
          <IconGridVisibility />
        </button>
      </div>
      <div className="lpr-divider" role="separator" aria-hidden="true" />
      <div className="lpr-group" aria-label="Привязка">
        <button
          type="button"
          className="lpr-btn"
          title="Привязка к углам"
          aria-label="Привязка к углам"
          aria-pressed={snapV}
          data-active={snapV}
          onClick={() => setSnapV(!snapV)}
        >
          <IconSnapVertex />
        </button>
        <button
          type="button"
          className="lpr-btn"
          title="Привязка к линиям"
          aria-label="Привязка к линиям"
          aria-pressed={snapE}
          data-active={snapE}
          onClick={() => setSnapE(!snapE)}
        >
          <IconSnapEdge />
        </button>
        <button
          type="button"
          className="lpr-btn"
          title="Привязка к сетке (магнит; не зависит от отображения линий сетки)"
          aria-label="Привязка к сетке"
          aria-pressed={snapG}
          data-active={snapG}
          onClick={() => setSnapG(!snapG)}
        >
          <IconSnapGrid />
        </button>
      </div>
      <div className="lpr-divider" role="separator" aria-hidden="true" />
      <label className="lpr-layer-toggle" title="Полосы по толщине для layered-профилей; при сильном отдалении — упрощение">
        <input
          type="checkbox"
          checked={show2dLayers}
          onChange={(e) => setShow2dProfileLayers(e.target.checked)}
        />
        <span className="lpr-layer-toggle__text">Слои 2D</span>
      </label>
    </aside>
  );
}
