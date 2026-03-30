import { Container, Text } from "pixi.js";

import type { Project } from "@/core/domain/project";
import { MIN_WALL_MARK_SCREEN_LENGTH_PX, wallSegmentScreenLengthPx } from "@/core/domain/wallMarking";
import { cssHexToPixiNumber } from "@/shared/cssColor";

import { collectDimensionLabelScreenPositions } from "./dimensions2dPixi";
import { exteriorNormalForWallLabelMm } from "./wallLabelExteriorNormalMm";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

export type WallMarkAppearance = "active" | "context";

/** Отступ подписи от края полосы стены, в экранных px (масштабируется в мм). */
const LABEL_OUTSET_PX_MIN = 8;
const LABEL_OUTSET_PX_MAX = 13;
/** Минимальное расстояние до центра подписи размера, px. */
const CLEARANCE_FROM_DIM_LABEL_PX = 18;
/** Радиус «занятости» подписи стены для анти-наложения, px (оценка). */
function approxLabelRadiusPx(fontSize: number, labelLen: number): number {
  return Math.max(10, fontSize * (0.4 + 0.2 * Math.max(1, labelLen)));
}

function readWallMarkThemeColors(): { readonly fill: number; readonly outline: number } {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const fill = cs.getPropertyValue("--color-wall-mark-text").trim() || "#e8ecf1";
  const outline = cs.getPropertyValue("--color-wall-mark-outline").trim() || "#14171b";
  return { fill: cssHexToPixiNumber(fill), outline: cssHexToPixiNumber(outline) };
}

function screenDist(
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isClearOfDimLabels(
  p: { readonly x: number; readonly y: number },
  dimCenters: readonly { readonly x: number; readonly y: number }[],
  radiusPx: number,
): boolean {
  for (const d of dimCenters) {
    if (screenDist(p, d) < CLEARANCE_FROM_DIM_LABEL_PX + radiusPx * 0.35) {
      return false;
    }
  }
  return true;
}

function isClearOfPlacedWallLabels(
  p: { readonly x: number; readonly y: number },
  placed: readonly { readonly x: number; readonly y: number; readonly r: number }[],
  radiusPx: number,
): boolean {
  for (const q of placed) {
    if (screenDist(p, { x: q.x, y: q.y }) < q.r + radiusPx + 3) {
      return false;
    }
  }
  return true;
}

export function clearWallMarkLabelContainer(container: Container): void {
  for (const c of [...container.children]) {
    c.destroy({ children: true });
  }
  container.removeChildren();
}

export type AppendWallMarkLabels2dOptions = {
  /**
   * Проект для позиций размерных подписей (активный слой).
   * Если не задан — анти-наложение с размерами не выполняется.
   */
  readonly dimensionProject?: Project;
};

/**
 * Подписи марок снаружи полосы стены: середина оси + сдвиг по внешней нормали
 * (для прямоугольника — по CCW-контуру; иначе — от центроида к стене).
 */
export function appendWallMarkLabels2d(
  container: Container,
  project: Project,
  t: ViewportTransform,
  appearance: WallMarkAppearance,
  options?: AppendWallMarkLabels2dOptions,
): void {
  const ctx = appearance === "context";
  const { fill: fillCol, outline: outlineCol } = readWallMarkThemeColors();
  const dimProject = options?.dimensionProject;
  const dimCenters = dimProject ? collectDimensionLabelScreenPositions(dimProject, t) : [];

  const wallsWithLabel = project.walls.filter((w) => {
    const label = w.markLabel?.trim();
    if (!label) {
      return false;
    }
    return wallSegmentScreenLengthPx(w, t.zoomPixelsPerMm) >= MIN_WALL_MARK_SCREEN_LENGTH_PX;
  });

  type Candidate = {
    readonly label: string;
    readonly screen: { x: number; y: number };
    readonly ang: number;
    readonly fs: number;
  };

  const candidates: Candidate[] = [];
  const placed: { x: number; y: number; r: number }[] = [];

  for (const w of wallsWithLabel) {
    const label = w.markLabel!.trim();
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    const { nx: n0x, ny: n0y } = exteriorNormalForWallLabelMm(w, wallsWithLabel, project.walls);

    const strokePx = Math.max(2, w.thicknessMm * t.zoomPixelsPerMm);
    const fs = Math.max(8, Math.min(10.5, strokePx * 0.22 + 7));
    const ang = Math.atan2(dy, dx);
    const rApprox = approxLabelRadiusPx(fs, label.length);

    const outsetPx = Math.min(LABEL_OUTSET_PX_MAX, Math.max(LABEL_OUTSET_PX_MIN, 10 + strokePx * 0.03));
    const halfT = w.thicknessMm / 2;

    const mx = (w.start.x + w.end.x) / 2;
    const my = (w.start.y + w.end.y) / 2;

    const alongStepsMm = [0, 32, -32, 64, -64, 120, -120];
    const outsetScaleSteps = [1, 0.88, 0.76];

    let chosen: { x: number; y: number } | null = null;

    outer: for (const scale of outsetScaleSteps) {
      const outsetMm = (outsetPx * scale) / t.zoomPixelsPerMm;
      for (const along of alongStepsMm) {
        const ax = mx + ux * along + n0x * (halfT + outsetMm);
        const ay = my + uy * along + n0y * (halfT + outsetMm);
        const s = worldToScreen(ax, ay, t);
        if (
          isClearOfDimLabels(s, dimCenters, rApprox) &&
          isClearOfPlacedWallLabels(s, placed, rApprox)
        ) {
          chosen = { x: s.x, y: s.y };
          break outer;
        }
      }
    }

    if (!chosen) {
      const outsetMm = outsetPx / t.zoomPixelsPerMm;
      const ax = mx + n0x * (halfT + outsetMm);
      const ay = my + n0y * (halfT + outsetMm);
      chosen = worldToScreen(ax, ay, t);
    }

    candidates.push({
      label,
      screen: chosen,
      ang,
      fs,
    });
    placed.push({ x: chosen.x, y: chosen.y, r: rApprox });
  }

  for (const c of candidates) {
    const txt = new Text({
      text: c.label,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: c.fs,
        fill: fillCol,
        fontWeight: "500",
        stroke: { color: outlineCol, width: Math.max(1.2, c.fs * 0.09) },
      },
    });
    txt.anchor.set(0.5);
    txt.x = c.screen.x;
    txt.y = c.screen.y;
    txt.rotation = c.ang;
    txt.alpha = ctx ? 0.42 : 0.96;
    container.addChild(txt);
  }
}
