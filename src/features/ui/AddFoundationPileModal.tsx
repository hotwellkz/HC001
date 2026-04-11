import { useEffect, useState } from "react";

import type { FoundationPileKind } from "@/core/domain/foundationPile";
import { useAppStore } from "@/store/useAppStore";

import "./layer-modals.css";

export function AddFoundationPileModal() {
  const open = useAppStore((s) => s.addFoundationPileModalOpen);
  const close = useAppStore((s) => s.closeAddFoundationPileModal);
  const apply = useAppStore((s) => s.applyAddFoundationPileModal);
  const session = useAppStore((s) => s.foundationPilePlacementSession);

  const [pileKind, setPileKind] = useState<FoundationPileKind>("reinforcedConcrete");
  const [sizeMm, setSizeMm] = useState(300);
  const [capSizeMm, setCapSizeMm] = useState(300);
  const [heightMm, setHeightMm] = useState(1000);
  const [levelMm, setLevelMm] = useState(-400);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPileKind("reinforcedConcrete");
    setSizeMm(300);
    setCapSizeMm(300);
    setHeightMm(1000);
    setLevelMm(-400);
  }, [open]);

  if (!open) {
    return null;
  }

  const submit = () => {
    apply({
      pileKind,
      sizeMm: Number(sizeMm),
      capSizeMm: Number(capSizeMm),
      heightMm: Number(heightMm),
      levelMm: Number(levelMm),
    });
  };

  return (
    <div className="lm-backdrop" role="presentation" onClick={close}>
      <div
        className="lm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="afp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="afp-title" className="lm-title">
          {session ? "Параметры сваи" : "Добавить сваю"}
        </h2>
        <p className="muted" style={{ margin: "0 0 12px", lineHeight: 1.5, fontSize: 13 }}>
          Свая создаётся на активном слое. Для фундамента переключитесь на слой «Фундамент» (или нужный слой с
          отметкой 0). После «Применить» укажите точки на плане — ЛКМ ставит сваю, Esc / ПКМ — выход.
        </p>
        <label className="lm-field">
          <span className="lm-label">Тип сваи</span>
          <select
            className="lm-input"
            value={pileKind}
            onChange={(e) => setPileKind(e.target.value as FoundationPileKind)}
          >
            <option value="reinforcedConcrete">Железобетонная свая</option>
            <option value="screw">Винтовая свая</option>
          </select>
        </label>
        <label className="lm-field">
          <span className="lm-label">Размер (мм)</span>
          <input
            className="lm-input"
            type="number"
            min={1}
            step={1}
            value={sizeMm}
            onChange={(e) => setSizeMm(Number(e.target.value))}
          />
        </label>
        <label className="lm-field">
          <span className="lm-label">Площадка (мм)</span>
          <input
            className="lm-input"
            type="number"
            min={1}
            step={1}
            value={capSizeMm}
            onChange={(e) => setCapSizeMm(Number(e.target.value))}
          />
        </label>
        <label className="lm-field">
          <span className="lm-label">Высота (мм)</span>
          <input
            className="lm-input"
            type="number"
            min={1}
            step={1}
            value={heightMm}
            onChange={(e) => setHeightMm(Number(e.target.value))}
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
