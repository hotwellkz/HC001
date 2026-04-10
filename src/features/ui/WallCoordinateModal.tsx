import { useEffect, useId, useState } from "react";

import { useAppStore } from "@/store/useAppStore";

import "./wall-coordinate-modal.css";

export function WallCoordinateModal() {
  const wallCoordOpen = useAppStore((s) => s.wallCoordinateModalOpen);
  const moveCopyCoordOpen = useAppStore((s) => s.wallMoveCopyCoordinateModalOpen);
  const lengthChangeCoordOpen = useAppStore((s) => s.lengthChangeCoordinateModalOpen);
  const wallMoveCopy = useAppStore((s) => s.wallMoveCopySession);
  const lengthChangeSession = useAppStore((s) => s.lengthChange2dSession);
  const open = wallCoordOpen || moveCopyCoordOpen || lengthChangeCoordOpen;
  const closeWallCoord = useAppStore((s) => s.closeWallCoordinateModal);
  const closeMoveCopyCoord = useAppStore((s) => s.closeWallMoveCopyCoordinateModal);
  const closeLengthChangeCoord = useAppStore((s) => s.closeLengthChangeCoordinateModal);
  const applyWallCoord = useAppStore((s) => s.applyWallCoordinateModal);
  const applyMoveCopyCoord = useAppStore((s) => s.applyWallMoveCopyCoordinateModal);
  const applyLengthChangeCoord = useAppStore((s) => s.applyLengthChangeCoordinateModal);
  const session = useAppStore((s) => s.wallPlacementSession);
  const lastError = useAppStore((s) => s.lastError);

  const titleId = useId();
  const [xStr, setXStr] = useState("0");
  const [yStr, setYStr] = useState("0");
  const [deltaStr, setDeltaStr] = useState("0");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (lengthChangeCoordOpen && lengthChangeSession) {
      const dx = lengthChangeSession.previewMovingMm.x - lengthChangeSession.fixedEndMm.x;
      const dy = lengthChangeSession.previewMovingMm.y - lengthChangeSession.fixedEndMm.y;
      const L = dx * lengthChangeSession.axisUx + dy * lengthChangeSession.axisUy;
      const d = Math.round(L - lengthChangeSession.initialLengthMm);
      setDeltaStr(String(d));
      setLocalError(null);
      return;
    }
    if (moveCopyCoordOpen && wallMoveCopy?.anchorWorldMm && wallMoveCopy.previewTargetMm) {
      const dx = wallMoveCopy.previewTargetMm.x - wallMoveCopy.anchorWorldMm.x;
      const dy = wallMoveCopy.previewTargetMm.y - wallMoveCopy.anchorWorldMm.y;
      setXStr(String(Math.round(dx)));
      setYStr(String(Math.round(dy)));
      setLocalError(null);
      return;
    }
    if (!session?.firstPointMm || !session.previewEndMm) {
      return;
    }
    const dx = session.previewEndMm.x - session.firstPointMm.x;
    const dy = session.previewEndMm.y - session.firstPointMm.y;
    setXStr(String(Math.round(dx)));
    setYStr(String(Math.round(dy)));
    setLocalError(null);
  }, [
    open,
    lengthChangeCoordOpen,
    lengthChangeSession?.previewMovingMm,
    lengthChangeSession?.fixedEndMm,
    lengthChangeSession?.axisUx,
    lengthChangeSession?.axisUy,
    lengthChangeSession?.initialLengthMm,
    moveCopyCoordOpen,
    wallMoveCopy?.anchorWorldMm,
    wallMoveCopy?.previewTargetMm,
    session?.firstPointMm,
    session?.previewEndMm,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (lengthChangeCoordOpen) {
          closeLengthChangeCoord();
        } else if (moveCopyCoordOpen) {
          closeMoveCopyCoord();
        } else {
          closeWallCoord();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lengthChangeCoordOpen, moveCopyCoordOpen, closeWallCoord, closeMoveCopyCoord, closeLengthChangeCoord]);

  if (!open) {
    return null;
  }

  const dxParsed = Number(xStr.replace(",", "."));
  const dyParsed = Number(yStr.replace(",", "."));
  const dShow =
    Number.isFinite(dxParsed) && Number.isFinite(dyParsed) ? Math.round(Math.hypot(dxParsed, dyParsed)) : "—";

  const submit = () => {
    setLocalError(null);
    if (lengthChangeCoordOpen) {
      const d = Number(deltaStr.replace(",", "."));
      if (!Number.isFinite(d)) {
        setLocalError("Введите числовое значение Δ (мм).");
        return;
      }
      applyLengthChangeCoord({ deltaMm: d });
      return;
    }
    const dx = Number(xStr.replace(",", "."));
    const dy = Number(yStr.replace(",", "."));
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      setLocalError("Введите числовые значения X и Y (мм).");
      return;
    }
    if (moveCopyCoordOpen) {
      applyMoveCopyCoord({ dxMm: dx, dyMm: dy });
    } else {
      applyWallCoord({ dxMm: dx, dyMm: dy });
    }
  };

  const err = localError ?? lastError;

  const closeBackdrop = () => {
    if (lengthChangeCoordOpen) {
      closeLengthChangeCoord();
    } else if (moveCopyCoordOpen) {
      closeMoveCopyCoord();
    } else {
      closeWallCoord();
    }
  };

  return (
    <div
      className="wcm-backdrop"
      role="presentation"
      onClick={closeBackdrop}
    >
      <div
        className="wcm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="wcm-title">
          {lengthChangeCoordOpen ? "Изменение длины" : "Координаты"}
        </h2>
        <p className="wcm-hint">
          {lengthChangeCoordOpen
            ? "Δ длины вдоль оси стены (мм). Положительное значение — удлинение, отрицательное — укорочение."
            : "Смещение второй точки относительно первой (мм). Знак учитывается."}
        </p>
        <div className="wcm-fields">
          {lengthChangeCoordOpen ? (
            <label className="wcm-field">
              <span className="wcm-label">Δ</span>
              <input
                className="wcm-input"
                type="text"
                inputMode="decimal"
                value={deltaStr}
                onChange={(e) => {
                  setDeltaStr(e.target.value);
                  setLocalError(null);
                }}
                autoFocus
              />
            </label>
          ) : (
            <>
              <label className="wcm-field">
                <span className="wcm-label">X</span>
                <input
                  className="wcm-input"
                  type="text"
                  inputMode="decimal"
                  value={xStr}
                  onChange={(e) => {
                    setXStr(e.target.value);
                    setLocalError(null);
                  }}
                  autoFocus
                />
              </label>
              <label className="wcm-field">
                <span className="wcm-label">Y</span>
                <input
                  className="wcm-input"
                  type="text"
                  inputMode="decimal"
                  value={yStr}
                  onChange={(e) => {
                    setYStr(e.target.value);
                    setLocalError(null);
                  }}
                />
              </label>
              <div className="wcm-field wcm-field--readonly">
                <span className="wcm-label">D</span>
                <span className="wcm-readonly" title="Диагональ (мм)">
                  {dShow}
                </span>
              </div>
            </>
          )}
        </div>
        {err ? (
          <p className="wcm-error" role="alert">
            {err}
          </p>
        ) : null}
        <div className="wcm-actions">
          <button type="button" className="wcm-btn wcm-btn--ghost" onClick={closeBackdrop}>
            Отмена
          </button>
          <button type="button" className="wcm-btn wcm-btn--primary" onClick={submit}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
