import { useEffect, useState } from "react";

import { useAppStore } from "@/store/useAppStore";

import "./layer-modals.css";

export function SlabEditModal() {
  const modal = useAppStore((s) => s.slabEditModal);
  const close = useAppStore((s) => s.closeSlabEditModal);
  const apply = useAppStore((s) => s.applySlabEditModal);
  const project = useAppStore((s) => s.currentProject);

  const slab = modal ? project.slabs.find((x) => x.id === modal.slabId) : undefined;

  const [depthMm, setDepthMm] = useState(1000);
  const [levelMm, setLevelMm] = useState(0);

  useEffect(() => {
    if (!modal || !slab) {
      return;
    }
    setDepthMm(slab.depthMm);
    setLevelMm(slab.levelMm);
  }, [modal, slab]);

  if (!modal) {
    return null;
  }

  if (!slab) {
    return (
      <div className="lm-backdrop" role="presentation" onClick={close}>
        <div
          className="lm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slab-edit-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="slab-edit-title" className="lm-title">
            Плита не найдена
          </h2>
          <div className="lm-actions">
            <button type="button" className="lm-btn lm-btn--primary" onClick={close}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
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
        aria-labelledby="slab-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="slab-edit-title" className="lm-title">
          Параметры плиты
        </h2>
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
          <span className="lm-label">Уровень верха в слое (мм)</span>
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
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
