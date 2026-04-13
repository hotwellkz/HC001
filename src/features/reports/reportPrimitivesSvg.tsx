import type { ReactNode } from "react";

import type { ReportPrimDimensionLine, ReportPrimTextBlock, ReportPrimitive, ReportRenderModel } from "@/core/reports/types";

const PRINT_STROKE = "#050505";
/** Сплошной контур ленты фундамента (без пунктира / без muted). */
const PRINT_FOUNDATION_STRIP = "#000000";
/** Размерные линии — отдельно от основной геометрии (печать Ч/Б даст более светлый серый). */
const PRINT_DIM_MAIN = "#0d47a1";
const PRINT_DIM_EXT = "#1976d2";
const PRINT_MUTED = "#1a1a1a";
const PAPER = "#ffffff";
const PRINT_POLY_MUTED = "#959595";
const PRINT_AXIS = "#383838";
const PRINT_ROOM_LABEL = "#141414";
/** Пунктир (вспомогательные линии) — отдельно от сплошного контура. */
const PRINT_DASH = "#795548";

function TextBlockPrim({ p }: { readonly p: ReportPrimTextBlock }) {
  const n = p.lines.length;
  if (n === 0) {
    return null;
  }
  const lh = p.lineHeightMm;
  const fs = p.fontSizeMm;
  const anchor = p.anchor === "middle" ? "middle" : p.anchor === "end" ? "end" : "start";
  /** Центр блока: первая строка выше (меньше Y в координатах листа). */
  const yTop = p.yMm - ((n - 1) * lh) / 2;
  const rot = p.rotationDeg ?? 0;
  const inner = (
    <>
      {p.lines.map((line, i) => (
        <text
          key={i}
          x={p.xMm}
          y={yTop + i * lh}
          fontSize={fs}
          fontWeight={500}
          textAnchor={anchor}
          dominantBaseline="middle"
          fill={PRINT_ROOM_LABEL}
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {line}
        </text>
      ))}
    </>
  );
  if (rot === 0) {
    return <g>{inner}</g>;
  }
  return <g transform={`rotate(${rot} ${p.xMm} ${p.yMm})`}>{inner}</g>;
}

function DimensionPrim({ p }: { readonly p: ReportPrimDimensionLine }) {
  const swMain = p.strokeMm ?? 0.12;
  const swExt = Math.max(0.07, swMain * 0.72);
  const fs = p.labelFontSizeMm ?? 5.55;

  const x1 = p.dimLineX1mm;
  const y1 = p.dimLineY1mm;
  const x2 = p.dimLineX2mm;
  const y2 = p.dimLineY2mm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const gap = p.centerGapMm ?? 0;
  const labelRot = p.labelRotationDeg ?? (len > 1e-9 ? (Math.atan2(dy, dx) * 180) / Math.PI : 0);

  let mainLines: ReactNode;
  if (gap > 0 && len > gap + 1e-3) {
    const ux = dx / len;
    const uy = dy / len;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const g2 = gap / 2;
    const xa = mx - ux * g2;
    const ya = my - uy * g2;
    const xb = mx + ux * g2;
    const yb = my + uy * g2;
    mainLines = (
      <>
        <line x1={x1} y1={y1} x2={xa} y2={ya} stroke={PRINT_DIM_MAIN} strokeWidth={swMain} vectorEffect="non-scaling-stroke" />
        <line x1={xb} y1={yb} x2={x2} y2={y2} stroke={PRINT_DIM_MAIN} strokeWidth={swMain} vectorEffect="non-scaling-stroke" />
      </>
    );
  } else {
    mainLines = (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PRINT_DIM_MAIN} strokeWidth={swMain} vectorEffect="non-scaling-stroke" />
    );
  }

  return (
    <g>
      <line
        x1={p.anchor1Xmm}
        y1={p.anchor1Ymm}
        x2={p.dimLineX1mm}
        y2={p.dimLineY1mm}
        stroke={PRINT_DIM_EXT}
        strokeWidth={swExt}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={p.anchor2Xmm}
        y1={p.anchor2Ymm}
        x2={p.dimLineX2mm}
        y2={p.dimLineY2mm}
        stroke={PRINT_DIM_EXT}
        strokeWidth={swExt}
        vectorEffect="non-scaling-stroke"
      />
      {mainLines}
      <text
        x={p.labelXmm}
        y={p.labelYmm}
        transform={`rotate(${labelRot} ${p.labelXmm} ${p.labelYmm})`}
        fontSize={fs}
        fontWeight={400}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={PRINT_DIM_MAIN}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {p.label}
      </text>
    </g>
  );
}

function Prim({ p }: { readonly p: ReportPrimitive }) {
  switch (p.kind) {
    case "line": {
      const isDash = p.dashMm != null && p.dashMm.length >= 2;
      const stroke = isDash ? PRINT_DASH : p.muted ? PRINT_AXIS : PRINT_STROKE;
      return (
        <line
          x1={p.x1Mm}
          y1={p.y1Mm}
          x2={p.x2Mm}
          y2={p.y2Mm}
          stroke={stroke}
          strokeWidth={p.strokeMm}
          strokeDasharray={p.dashMm?.join(" ")}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "polyline": {
      const d = p.pointsMm.map((q, i) => `${i === 0 ? "M" : "L"} ${q.x} ${q.y}`).join(" ");
      const closed = p.closed ? " Z" : "";
      const isDash = p.dashMm != null && p.dashMm.length >= 2;
      const stroke = isDash
        ? PRINT_DASH
        : p.muted
          ? PRINT_POLY_MUTED
          : PRINT_FOUNDATION_STRIP;
      const hasFill = Boolean(p.closed && p.fill);
      const noStroke = p.strokeMm <= 1e-9;
      return (
        <path
          d={d + closed}
          fill={hasFill ? (p.fill ?? "none") : "none"}
          stroke={noStroke ? "none" : stroke}
          strokeWidth={noStroke ? 0 : p.strokeMm}
          strokeDasharray={p.dashMm?.join(" ")}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "rect": {
      const noStroke = p.strokeMm <= 1e-9;
      return (
        <rect
          x={p.xMm}
          y={p.yMm}
          width={p.widthMm}
          height={p.heightMm}
          fill={p.fill ?? "none"}
          stroke={noStroke ? "none" : PRINT_STROKE}
          strokeWidth={noStroke ? 0 : p.strokeMm}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "image":
      return (
        <image
          href={p.href}
          x={p.xMm}
          y={p.yMm}
          width={p.widthMm}
          height={p.heightMm}
          preserveAspectRatio={p.preserveAspectRatio ?? "xMidYMid slice"}
        />
      );
    case "text": {
      const anchor = p.anchor === "middle" ? "middle" : p.anchor === "end" ? "end" : "start";
      const rot = p.rotationDeg ?? 0;
      const txt = (
        <text
          x={p.xMm}
          y={p.yMm}
          fontSize={p.fontSizeMm}
          fontWeight={400}
          textAnchor={anchor}
          dominantBaseline="middle"
          fill={PRINT_STROKE}
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {p.text}
        </text>
      );
      if (rot === 0) {
        return txt;
      }
      return <g transform={`rotate(${rot} ${p.xMm} ${p.yMm})`}>{txt}</g>;
    }
    case "textBlock":
      return <TextBlockPrim p={p} />;
    case "dimensionLine":
      return <DimensionPrim p={p} />;
    case "tableBlock": {
      const rows: ReactNode[] = [];
      let y = p.yMm;
      for (let ri = 0; ri < p.cells.length; ri++) {
        const row = p.cells[ri]!;
        const h = p.rowHeightsMm[ri] ?? 6;
        let x = p.xMm;
        for (let ci = 0; ci < row.length; ci++) {
          const w = p.colWidthsMm[ci] ?? 20;
          rows.push(
            <g key={`${ri}-${ci}`}>
              <rect x={x} y={y} width={w} height={h} fill="none" stroke={PRINT_MUTED} strokeWidth={0.15} />
              <text
                x={x + 1}
                y={y + h / 2}
                fontSize={p.fontSizeMm}
                fontWeight={400}
                dominantBaseline="middle"
                fill={PRINT_STROKE}
              >
                {row[ci]}
              </text>
            </g>,
          );
          x += w;
        }
        y += h;
      }
      return <g>{rows}</g>;
    }
    default: {
      const _e: never = p;
      return _e;
    }
  }
}


export interface ReportSvgCanvasProps {
  readonly model: ReportRenderModel;
}

export function ReportSvgCanvas({ model }: ReportSvgCanvasProps) {
  return (
    <svg
      className="reports-svg"
      viewBox={`0 0 ${model.pageWidthMm} ${model.pageHeightMm}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={model.pageWidthMm} height={model.pageHeightMm} fill={PAPER} />
      {model.primitives.map((p, i) => (
        <Prim key={i} p={p} />
      ))}
    </svg>
  );
}
