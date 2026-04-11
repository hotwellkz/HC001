import { Container, Text } from "pixi.js";

import type { Project } from "@/core/domain/project";
import { cssColorToPixiNumber } from "@/shared/cssColor";

import { collectDimensionLabelScreenPositions } from "./dimensions2dPixi";
import { openingPlanLabelRotationRad } from "./openingPlanLabelOrientation2d";
import { computePlanOpeningLabelScreenAnchor } from "./wallLabelLayout2d";
import type { WallMarkAppearance } from "./wallMarks2dPixi";
import type { AppendWallMarkLabels2dOptions } from "./wallMarks2dPixi";
import type { ViewportTransform } from "./viewportTransforms";

function readOpeningLabelColors(): { readonly fill: number; readonly outline: number } {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const fill = cs.getPropertyValue("--color-wall-mark-text").trim() || "#e8ecf1";
  const outline = cs.getPropertyValue("--color-wall-mark-outline").trim() || "#14171b";
  return { fill: cssColorToPixiNumber(fill), outline: cssColorToPixiNumber(outline) };
}

function windowOrderMap(project: Project): ReadonlyMap<string, number> {
  const windows = project.openings
    .filter((o): o is typeof o & { wallId: string; offsetFromStartMm: number } => {
      return o.kind === "window" && o.wallId != null && o.offsetFromStartMm != null;
    })
    .sort((a, b) => {
      if (a.wallId !== b.wallId) {
        return a.wallId.localeCompare(b.wallId);
      }
      if (a.offsetFromStartMm !== b.offsetFromStartMm) {
        return a.offsetFromStartMm - b.offsetFromStartMm;
      }
      return a.id.localeCompare(b.id);
    });
  const out = new Map<string, number>();
  for (let i = 0; i < windows.length; i++) {
    out.set(windows[i]!.id, i + 1);
  }
  return out;
}

/**
 * Подписи ОК-n и ширина/высота у проёма; снаружи полосы стены по внешней нормали.
 * Перед кадром контейнер нужно очистить (как для марок стен).
 */
export function appendWindowOpeningLabels2d(
  container: Container,
  project: Project,
  t: ViewportTransform,
  appearance: WallMarkAppearance,
  options?: AppendWallMarkLabels2dOptions,
): void {
  const ctx = appearance === "context";
  const { fill: fillCol, outline: outlineCol } = readOpeningLabelColors();
  const dimProject = options?.dimensionProject;
  const dimCenters = dimProject ? collectDimensionLabelScreenPositions(dimProject, t) : [];
  const allWalls = project.walls;
  const numberById = windowOrderMap(project);

  for (const o of project.openings) {
    if (o.kind !== "window" || o.wallId == null || o.offsetFromStartMm == null) {
      continue;
    }
    const wall = allWalls.find((w) => w.id === o.wallId);
    if (!wall) {
      continue;
    }
    const num = numberById.get(o.id) ?? 0;
    const line1 = `OK_${num}`;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      continue;
    }
    const anchor = computePlanOpeningLabelScreenAnchor(wall, o, allWalls, t, dimCenters);
    const fs = anchor.fontSizePx;
    /** Фиксируем отступ в экранных px, чтобы подпись не улетала при любом zoom. */
    const lineGapMm = 16 / Math.max(0.01, t.zoomPixelsPerMm);

    const wMm = Math.round(o.widthMm);
    const hMm = Math.round(o.heightMm);
    const line2 = `${wMm}/${hMm}`;

    const pos = { mid: anchor.mid };
    const label = new Text({
      text: `${line1}\n${line2}`,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: fs,
        lineHeight: fs + Math.max(2, lineGapMm * t.zoomPixelsPerMm * 0.15),
        align: "center",
        fill: fillCol,
        fontWeight: "600",
        stroke: { color: outlineCol, width: Math.max(1, fs * 0.1) },
      },
    });
    label.anchor.set(0.5);
    label.x = pos.mid.x;
    label.y = pos.mid.y;
    label.rotation = openingPlanLabelRotationRad(dx, dy, t);
    label.alpha = ctx ? 0.4 : 0.94;
    container.addChild(label);
  }
}
