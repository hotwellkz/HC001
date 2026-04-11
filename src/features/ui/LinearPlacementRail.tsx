import type { ReactNode } from "react";
import {
  AlignLeft,
  AlignRight,
  Boxes,
  CircleDot,
  Grid3x3,
  ScanEye,
  SeparatorHorizontal,
  Slash,
  Square,
} from "lucide-react";

import type { LinearProfilePlacementMode } from "@/core/geometry/linearPlacementGeometry";
import type { WallShapeMode } from "@/core/domain/wallShapeMode";
import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useAppStore } from "@/store/useAppStore";

import "./linear-placement-rail.css";

const SHAPES: readonly { mode: WallShapeMode; title: string; icon: ReactNode }[] = [
  { mode: "line", title: "Линия", icon: <LucideToolIcon icon={Slash} className="lpr-icon" /> },
  { mode: "rectangle", title: "Прямоугольник", icon: <LucideToolIcon icon={Square} className="lpr-icon" /> },
];

const MODES: readonly { mode: LinearProfilePlacementMode; title: string; icon: ReactNode }[] = [
  { mode: "center", title: "По центру", icon: <LucideToolIcon icon={CircleDot} className="lpr-icon" /> },
  { mode: "leftEdge", title: "По левому краю", icon: <LucideToolIcon icon={AlignLeft} className="lpr-icon" /> },
  { mode: "rightEdge", title: "По правому краю", icon: <LucideToolIcon icon={AlignRight} className="lpr-icon" /> },
];

export function LinearPlacementRail() {
  const planScope = useAppStore((s) => s.currentProject.viewState.editor2dPlanScope);
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

  const showWallShapes = planScope === "main";

  return (
    <aside className="lpr" aria-label={showWallShapes ? "Режимы построения стены" : "Привязка профиля к линии"}>
      {showWallShapes ? (
        <>
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
        </>
      ) : null}
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
          <LucideToolIcon icon={ScanEye} className="lpr-icon" />
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
          <LucideToolIcon icon={Boxes} className="lpr-icon" />
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
          <LucideToolIcon icon={SeparatorHorizontal} className="lpr-icon" />
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
          <LucideToolIcon icon={Grid3x3} className="lpr-icon" />
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
