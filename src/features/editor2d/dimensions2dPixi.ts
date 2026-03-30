import { Container, Graphics, Text } from "pixi.js";

import type { Dimension } from "@/core/domain/dimension";
import type { Project } from "@/core/domain/project";
import { cssHexToPixiNumber } from "@/shared/cssColor";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

function readDimensionThemeColors(): { readonly line: number; readonly text: number } {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const line = cs.getPropertyValue("--color-dimension-line").trim() || "#8a96a8";
  const text = cs.getPropertyValue("--color-dimension-text").trim() || "#c5ccd6";
  return { line: cssHexToPixiNumber(line), text: cssHexToPixiNumber(text) };
}

/** Центр подписи размера в мировых мм (на размерной линии). */
export function dimensionLabelCenterWorldMm(d: Dimension): { readonly mx: number; readonly my: number } | null {
  const offsetMm = d.offsetMm ?? 420;
  const { nx, ny } = outwardNormalForDimLine(d);
  const ax = d.a.x;
  const ay = d.a.y;
  const bx = d.b.x;
  const by = d.b.y;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const aOffX = ax + nx * offsetMm;
  const aOffY = ay + ny * offsetMm;
  const bOffX = bx + nx * offsetMm;
  const bOffY = by + ny * offsetMm;
  return { mx: (aOffX + bOffX) / 2, my: (aOffY + bOffY) / 2 };
}

/** Экранные позиции центров подписей размеров (для анти-наложения с марками стен). */
export function collectDimensionLabelScreenPositions(
  project: Project,
  t: ViewportTransform,
): readonly { readonly x: number; readonly y: number }[] {
  const layerId = project.activeLayerId;
  const dims = project.dimensions.filter((d) => !d.layerId || d.layerId === layerId);
  const out: { x: number; y: number }[] = [];
  for (const d of dims) {
    const c = dimensionLabelCenterWorldMm(d);
    if (!c) {
      continue;
    }
    const s = worldToScreen(c.mx, c.my, t);
    out.push({ x: s.x, y: s.y });
  }
  return out;
}

/** Единичная нормаль «наружу» от линии измерения к размерной линии (мировые координаты). */
function outwardNormalForDimLine(d: Dimension): { readonly nx: number; readonly ny: number } {
  if (d.kind === "rectangle_outer_horizontal") {
    return { nx: 0, ny: -1 };
  }
  if (d.kind === "rectangle_outer_vertical") {
    return { nx: 1, ny: 0 };
  }
  const ax = d.a.x;
  const ay = d.a.y;
  const bx = d.b.x;
  const by = d.b.y;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { nx: 0, ny: -1 };
  }
  const lx = -dy / len;
  const ly = dx / len;
  return { nx: lx, ny: ly };
}

function drawCadEndTicks(
  g: Graphics,
  px: number,
  py: number,
  ux: number,
  uy: number,
  tickLenPx: number,
  color: number,
  alpha: number,
): void {
  const nx = -uy;
  const ny = ux;
  g.moveTo(px - nx * tickLenPx * 0.5 - ux * tickLenPx * 0.35, py - ny * tickLenPx * 0.5 - uy * tickLenPx * 0.35);
  g.lineTo(px + nx * tickLenPx * 0.5 + ux * tickLenPx * 0.35, py + ny * tickLenPx * 0.5 + uy * tickLenPx * 0.35);
  g.stroke({ width: 1, color, alpha });
}

/**
 * Размерные линии в стиле CAD: выноски, тонкая линия, засечки, текст по центру.
 */
export function drawDimensions2d(
  linesG: Graphics,
  labelsC: Container,
  project: Project,
  t: ViewportTransform,
): void {
  linesG.clear();
  clearDimensionLabels(labelsC);
  const layerId = project.activeLayerId;
  const dims = project.dimensions.filter((d) => !d.layerId || d.layerId === layerId);
  if (dims.length === 0) {
    return;
  }
  const { line: LINE, text: TEXT_COL } = readDimensionThemeColors();
  const lineAlpha = 0.92;
  const textAlpha = 0.95;

  for (const d of dims) {
    const overshootMm = d.extensionOvershootMm ?? 72;
    const { nx, ny } = outwardNormalForDimLine(d);
    const ax = d.a.x;
    const ay = d.a.y;
    const bx = d.b.x;
    const by = d.b.y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;

    const offsetMm = d.offsetMm ?? 420;
    const aOffX = ax + nx * offsetMm;
    const aOffY = ay + ny * offsetMm;
    const bOffX = bx + nx * offsetMm;
    const bOffY = by + ny * offsetMm;

    const aoX = ax - ux * overshootMm;
    const aoY = ay - uy * overshootMm;
    const boX = bx + ux * overshootMm;
    const boY = by + uy * overshootMm;

    const aExt0 = worldToScreen(ax, ay, t);
    const aExt1 = worldToScreen(aOffX, aOffY, t);
    const bExt0 = worldToScreen(bx, by, t);
    const bExt1 = worldToScreen(bOffX, bOffY, t);

    linesG.moveTo(aExt0.x, aExt0.y);
    linesG.lineTo(aExt1.x, aExt1.y);
    linesG.stroke({ width: 1, color: LINE, alpha: lineAlpha * 0.55 });

    linesG.moveTo(bExt0.x, bExt0.y);
    linesG.lineTo(bExt1.x, bExt1.y);
    linesG.stroke({ width: 1, color: LINE, alpha: lineAlpha * 0.55 });

    const d0 = worldToScreen(aoX, aoY, t);
    const d1 = worldToScreen(boX, boY, t);
    linesG.moveTo(d0.x, d0.y);
    linesG.lineTo(d1.x, d1.y);
    linesG.stroke({ width: 1, color: LINE, alpha: lineAlpha });

    const tickPx = Math.max(5, 5 * t.zoomPixelsPerMm * 0.25);
    drawCadEndTicks(linesG, aExt1.x, aExt1.y, ux, uy, tickPx, LINE, lineAlpha);
    drawCadEndTicks(linesG, bExt1.x, bExt1.y, ux, uy, tickPx, LINE, lineAlpha);

    const center = dimensionLabelCenterWorldMm(d);
    if (!center) {
      continue;
    }
    const ms = worldToScreen(center.mx, center.my, t);
    const ang = Math.atan2(uy, ux);
    const label = String(d.textValueMm ?? Math.round(len));
    const fs = Math.max(10, Math.min(11.5, 8 + t.zoomPixelsPerMm * 0.02));
    const txt = new Text({
      text: label,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: fs,
        fill: TEXT_COL,
        fontWeight: "500",
      },
    });
    txt.anchor.set(0.5);
    txt.x = ms.x;
    txt.y = ms.y;
    txt.rotation = ang;
    txt.alpha = textAlpha;
    labelsC.addChild(txt);
  }
}

function clearDimensionLabels(c: Container): void {
  for (const ch of [...c.children]) {
    ch.destroy({ children: true });
  }
  c.removeChildren();
}
