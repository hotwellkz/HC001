import { useEffect, useState } from "react";

import { useAppStore } from "@/store/useAppStore";

import "./layer-modals.css";

export function AddSlabModal() {
  const open = useAppStore((s) => s.addSlabModalOpen);
  const close = useAppStore((s) => s.closeAddSlabModal);
  const apply = useAppStore((s) => s.applyAddSlabModal);
  const sticky = useAppStore((s) => s.lastSlabPlacementParams);
  const session = useAppStore((s) => s.slabPlacementSession);

  const [depthMm, setDepthMm] = useState(1000);
  const [levelMm, setLevelMm] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDepthMm(sticky.depthMm);
    setLevelMm(sticky.levelMm);
  }, [open, sticky.depthMm, sticky.levelMm]);

  if (!open) {
    return null;
  }

  const submit = () => {
    apply({
      depthMm: Number(depthMm),
      levelMm: Number(levelMm),
    });
  };

  return (
    <div className="lm-backdrop" role="presentation" onClick={close}>
      <div
        className="lm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slab-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="slab-add-title" className="lm-title">
          {session ? "Параметры плиты" : "Добавить плиту"}
        </h2>
        <p className="muted" style={{ margin: "0 0 12px", lineHeight: 1.5, fontSize: 13 }}>
          Плита создаётся на активном слое. Глубина — толщина вниз от верхней плоскости; уровень — отметка верхней
          плоскости относительно нуля проекта (мм).
        </p>
        <label className="lm-field">
          <span className="lm-label">Глубина (мм)</span>
          <input
            className="lm-input"
            type="number"
            min={1}
            step={1}
            value={depthMm}
            onChange={(e) => setDepthMm(Number(e.target.value))}
          />
        </label>
        <label className="lm-field">
          <span className="lm-label">Уровень (мм)</span>
          <input
            className="lm-input"
            type="number"
            step={1}
            value={levelMm}
            onChange={(e) => setLevelMm(Number(e.target.value))}
          />
        </label>
        <p className="muted" style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.45 }}>
          Режим контура (прямоугольник / полилиния) выберите на правой панели после «Применить».
        </p>
        <div className="lm-actions">
          <button type="button" className="lm-btn lm-btn--ghost" onClick={close}>
            Отмена
          </button>
          <button type="button" className="lm-btn lm-btn--primary" onClick={submit}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
