import { useEffect, useMemo, useState } from "react";

import type { FloorInsulationAreaMode, FloorInsulationLayoutMode } from "@/core/domain/floorInsulation";
import { getLayerById } from "@/core/domain/layerOps";
import { getProfilesByCategory } from "@/core/domain/profileOps";
import { insulationMaterialDisplayLabel } from "@/core/domain/insulationProfile";
import { useAppStore } from "@/store/useAppStore";

import "./layer-modals.css";

const LAYOUT_OPTIONS: { readonly value: FloorInsulationLayoutMode; readonly label: string }[] = [
  { value: "auto", label: "Авто" },
  { value: "alongBeams", label: "Вдоль балок" },
  { value: "acrossBeams", label: "Поперёк балок" },
];

export function FloorInsulationModal() {
  const open = useAppStore((s) => s.floorInsulationModalOpen);
  const close = useAppStore((s) => s.closeFloorInsulationModal);
  const apply = useAppStore((s) => s.applyFloorInsulationModal);
  const clearLayer = useAppStore((s) => s.clearFloorInsulationActiveLayer);
  const project = useAppStore((s) => s.currentProject);
  const activeLayerId = project.activeLayerId;
  const layer = getLayerById(project, activeLayerId);
  const lastProfileId = useAppStore((s) => s.floorInsulationToolProfileId);
  const lastLayout = useAppStore((s) => s.floorInsulationToolLayoutMode);
  const lastArea = useAppStore((s) => s.floorInsulationAreaMode);

  const insulationProfiles = useMemo(() => getProfilesByCategory(project, "insulation"), [project.profiles]);

  const [profileId, setProfileId] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<FloorInsulationLayoutMode>("auto");
  const [areaMode, setAreaMode] = useState<FloorInsulationAreaMode>("rectangle");

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.repeat) {
        return;
      }
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (lastProfileId && insulationProfiles.some((p) => p.id === lastProfileId)) {
      setProfileId(lastProfileId);
    } else if (insulationProfiles[0]) {
      setProfileId(insulationProfiles[0]!.id);
    } else {
      setProfileId("");
    }
    setLayoutMode(lastLayout);
    setAreaMode(lastArea);
  }, [open, lastProfileId, lastLayout, lastArea, insulationProfiles]);

  const selected = useMemo(
    () => insulationProfiles.find((p) => p.id === profileId),
    [insulationProfiles, profileId],
  );
  const ins = selected?.insulation;

  if (!open) {
    return null;
  }

  const slabOk = layer?.domain === "slab";
  const canApply = slabOk && profileId.length > 0 && ins != null;

  return (
    <div className="lm-backdrop" role="presentation" onClick={close}>
      <div
        className="lm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fi-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fi-modal-title" className="lm-title">
          Утепление между балками
        </h2>
        <p className="muted" style={{ margin: "0 0 12px", lineHeight: 1.5, fontSize: 13 }}>
          Выберите сохранённый профиль утеплителя и способ задания области на плане. После «Применить» укажите область
          кликами; утеплитель рассчитывается в просветах между балками по профилю.
        </p>
        {!slabOk ? (
          <p className="muted" style={{ color: "var(--color-warning, #b45309)", marginBottom: 12 }}>
            Активный слой не «перекрытие» — переключите слой или выберите другой.
          </p>
        ) : null}
        {insulationProfiles.length === 0 ? (
          <p className="muted" style={{ marginBottom: 12 }}>
            Нет профилей категории «Утеплитель». Создайте профиль в разделе «Профили».
          </p>
        ) : null}

        <label className="lm-field">
          <span className="lm-label">Профиль утеплителя</span>
          <select
            className="lm-input"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            disabled={!slabOk || insulationProfiles.length === 0}
          >
            {insulationProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {ins ? (
          <div
            className="muted"
            style={{
              margin: "10px 0",
              fontSize: 12,
              lineHeight: 1.55,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 12px",
            }}
          >
            <span>Материал</span>
            <span>{insulationMaterialDisplayLabel(ins.materialKind, ins.customMaterialLabel)}</span>
            <span>Лист, мм</span>
            <span>
              {Math.round(ins.sheetLengthMm)} × {Math.round(ins.sheetWidthMm)}
            </span>
            <span>Толщина</span>
            <span>{Math.round(ins.thicknessMm)} мм</span>
            <span>Зазор</span>
            <span>{Math.round(ins.technologicalGapMm)} мм</span>
          </div>
        ) : null}

        <label className="lm-field">
          <span className="lm-label">Раскладка листов</span>
          <select
            className="lm-input"
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as FloorInsulationLayoutMode)}
            disabled={!canApply}
          >
            {LAYOUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "10px 12px", margin: "12px 0" }}>
          <legend style={{ fontSize: 12, padding: "0 6px" }}>Область заполнения</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="fi-area"
              checked={areaMode === "rectangle"}
              onChange={() => setAreaMode("rectangle")}
              disabled={!canApply}
            />
            <span>Прямоугольник (две точки по диагонали)</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="fi-area"
              checked={areaMode === "polygon"}
              onChange={() => setAreaMode("polygon")}
              disabled={!canApply}
            />
            <span>По точкам (полигон); Enter или двойной клик — завершить контур</span>
          </label>
        </fieldset>

        <div className="lm-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" className="lm-btn lm-btn--primary" disabled={!canApply} onClick={() => apply({ profileId, layoutMode, areaMode })}>
            Применить
          </button>
          <button type="button" className="lm-btn lm-btn--ghost" onClick={close}>
            Отмена
          </button>
          <button
            type="button"
            className="lm-btn lm-btn--ghost"
            disabled={!slabOk}
            onClick={() => {
              clearLayer();
            }}
            title="Удалить все куски утеплителя на активном слое"
          >
            Очистить слой
          </button>
        </div>
      </div>
    </div>
  );
}
