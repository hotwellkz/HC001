import { useEffect, useState } from "react";

import type { FloorBeamSplitMode } from "@/core/domain/floorBeamSplitMode";
import { useAppStore } from "@/store/useAppStore";

import "./layer-modals.css";

export function FloorBeamSplitModal() {
  const open = useAppStore((s) => s.floorBeamSplitModalOpen);
  const close = useAppStore((s) => s.closeFloorBeamSplitModal);
  const apply = useAppStore((s) => s.applyFloorBeamSplitModal);

  const [mode, setMode] = useState<FloorBeamSplitMode>("maxLength");
  const [overlapMm, setOverlapMm] = useState(0);

  useEffect(() => {
    if (open) {
      setMode("maxLength");
      setOverlapMm(0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const submit = () => {
    const o = Number(overlapMm);
    if (!Number.isFinite(o) || o < 0) {
      return;
    }
    apply({ mode, overlapMm: o });
  };

  return (
    <div className="lm-backdrop" role="presentation" onClick={close}>
      <div
        className="lm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fbs-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fbs-title" className="lm-title">
          Разделить балку / профиль
        </h2>
        <p className="lm-muted" style={{ marginTop: 0 }}>
          Задайте параметры и нажмите «Применить», затем укажите на плане элемент перекрытия (клик по балке или профилю).
        </p>
        <label className="lm-field">
          <span className="lm-label">Наложение, мм</span>
          <input
            className="lm-input"
            type="number"
            min={0}
            step={1}
            value={overlapMm}
            onChange={(e) => setOverlapMm(Number(e.target.value))}
          />
        </label>
        <fieldset className="lm-field" style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className="lm-label" style={{ marginBottom: 8 }}>
            Режим
          </legend>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input type="radio" name="fbs-mode" checked={mode === "maxLength"} onChange={() => setMode("maxLength")} />
            <span>Делить по максимальной длине</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input type="radio" name="fbs-mode" checked={mode === "center"} onChange={() => setMode("center")} />
            <span>Делить по центру</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="radio" name="fbs-mode" checked={mode === "atPoint"} onChange={() => setMode("atPoint")} />
            <span>Делить по указанному месту</span>
          </label>
        </fieldset>
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
