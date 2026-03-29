import { Container, Text } from "pixi.js";

import type { Project } from "@/core/domain/project";
import { MIN_WALL_MARK_SCREEN_LENGTH_PX, wallSegmentScreenLengthPx } from "@/core/domain/wallMarking";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

export type WallMarkAppearance = "active" | "context";

export function clearWallMarkLabelContainer(container: Container): void {
  for (const c of [...container.children]) {
    c.destroy({ children: true });
  }
  container.removeChildren();
}

/**
 * Подписи марок по центру стены, вдоль оси; не участвуют в hit-test (отдельный контейнер).
 */
export function appendWallMarkLabels2d(
  container: Container,
  project: Project,
  t: ViewportTransform,
  appearance: WallMarkAppearance,
): void {
  const ctx = appearance === "context";
  for (const w of project.walls) {
    const label = w.markLabel?.trim();
    if (!label) {
      continue;
    }
    if (wallSegmentScreenLengthPx(w, t.zoomPixelsPerMm) < MIN_WALL_MARK_SCREEN_LENGTH_PX) {
      continue;
    }
    const a = worldToScreen(w.start.x, w.start.y, t);
    const b = worldToScreen(w.end.x, w.end.y, t);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const strokePx = Math.max(2, w.thicknessMm * t.zoomPixelsPerMm);
    const fs = Math.max(9, Math.min(13, strokePx * 0.28 + 8));

    const txt = new Text({
      text: label,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: fs,
        fill: ctx ? 0x6a7585 : 0x4a6a8a,
        fontWeight: "500",
      },
    });
    txt.anchor.set(0.5);
    txt.x = cx;
    txt.y = cy;
    txt.rotation = ang;
    txt.alpha = ctx ? 0.35 : 0.95;
    container.addChild(txt);
  }
}
