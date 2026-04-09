import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Opening } from "@/core/domain/opening";

import { useAppStore } from "@/store/useAppStore";

import "./wall-detail-workspace.css";
import {
  internalWallJointSeamCentersAlongMm,
  lumberPieceWallElevationRectMm,
} from "@/core/domain/wallCalculation3dSpecs";
import {
  formatLumberFullDisplayMark,
  formatSipPanelDisplayMark,
  lumberDisplayIndexByPieceId,
  lumberPiecesSortedForDisplay,
  sipRegionsSortedForDisplay,
  wallMarkLabelForDisplay,
} from "@/core/domain/pieceDisplayMark";
import {
  drawDimensionLevel,
  VerticalDimensionMm,
  WD_DIM_V_LABEL_GAP_EXTRA_PX,
  WD_DIM_V_LABEL_GAP_PX,
} from "@/features/ui/wallDetailDimensionsSvg";
import { WallDetailTopViewPlan } from "@/features/ui/wallDetailTopView2d";

/** Верх фасада стены (мм по листу). */
const SHEET_WALL_TOP_MM = 96;
/** Отступ от верха листа до заголовка стены. */
const TITLE_ABOVE_WALL_MM = 44;
/** Горизонтальная зона слева под вертикальные размеры фасада (мм). */
const LEFT_DIM_X0_MM = -118;
/** Ниже фасада: большой зон до блока «Вид сверху». */
const GAP_WALL_BOTTOM_TO_TOPVIEW_MM = 320;
/** Подпись «Вид сверху» над прямоугольником плана. */
const TOPVIEW_TITLE_SPACE_MM = 36;
/** Вертикальный зазор между рядами размерных цепочек (базовая линия → базовая линия). */
const GAP_BETWEEN_DIM_ROWS_MM = 88;
/** Дополнительная высота на строки внутри одного уровня (пересечения сегментов). */
const DIM_ROW_STACK_STEP_MM = 38;
/** Ниже последнего ряда размеров — запас под подписи. */
const SHEET_PAD_BOTTOM_MM = 56;
/** Ниже и справа/слева листа — поля для fit. */
const FIT_PADDING_PX = 28;
/** Минимальный и максимальный масштаб (мм листа → пиксель). */
const ZOOM_MIN = 0.015;
const ZOOM_MAX = 0.45;

function dimStackDepth(segments: readonly { a: number; b: number }[]): number {
  const placed: { x0: number; x1: number; row: number }[] = [];
  let maxRow = 0;
  const gap = DIM_ROW_STACK_STEP_MM;
  for (const s of segments) {
    const minX = Math.min(s.a, s.b);
    const maxX = Math.max(s.a, s.b);
    let row = 0;
    while (placed.some((p) => p.row === row && !(maxX < p.x0 - gap || minX > p.x1 + gap))) row += 1;
    placed.push({ x0: minX, x1: maxX, row });
    maxRow = Math.max(maxRow, row);
  }
  return maxRow + 1;
}

function bottomOfDimLevel(baseYMm: number, segments: readonly { a: number; b: number }[]): number {
  const depth = Math.max(1, dimStackDepth(segments));
  return baseYMm + (depth - 1) * DIM_ROW_STACK_STEP_MM + 22;
}

/** Прямоугольник в мм листа (y вниз, как в SVG). */
interface SheetMmRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function intersectSheetRects(a: SheetMmRect, b: SheetMmRect): SheetMmRect | null {
  const x0 = Math.max(a.x0, b.x0);
  const y0 = Math.max(a.y0, b.y0);
  const x1 = Math.min(a.x1, b.x1);
  const y1 = Math.min(a.y1, b.y1);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) {
    return null;
  }
  return { x0, y0, x1, y1 };
}

/** Проёмы на фасаде в координатах листа (как в отрисовке проёма). */
function openingRectsSheetMm(openings: readonly Opening[], wallBottomMm: number): SheetMmRect[] {
  const out: SheetMmRect[] = [];
  for (const o of openings) {
    if (o.offsetFromStartMm == null) continue;
    const x0 = o.offsetFromStartMm;
    const x1 = x0 + o.widthMm;
    const yTop =
      o.kind === "door" ? wallBottomMm - o.heightMm : wallBottomMm - o.heightMm - (o.sillHeightMm ?? 0);
    const yBot = yTop + o.heightMm;
    out.push({ x0, y0: yTop, x1, y1: yBot });
  }
  return out;
}

/** Вырезы проёмов внутри прямоугольника SIP-панели (ядро между обвязками). */
function sipPanelHoleRectsMm(
  panelX0: number,
  panelX1: number,
  coreTopMm: number,
  coreBottomMm: number,
  openings: readonly Opening[],
  wallBottomMm: number,
): SheetMmRect[] {
  const panel: SheetMmRect = { x0: panelX0, y0: coreTopMm, x1: panelX1, y1: coreBottomMm };
  const holes: SheetMmRect[] = [];
  for (const r of openingRectsSheetMm(openings, wallBottomMm)) {
    const ir = intersectSheetRects(panel, r);
    if (ir) {
      holes.push(ir);
    }
  }
  return holes;
}

export function WallDetailWorkspace() {
  const project = useAppStore((s) => s.currentProject);
  const selectedIds = useAppStore((s) => s.selectedEntityIds);
  const wallDetailWallId = useAppStore((s) => s.wallDetailWallId);
  const closeWallDetail = useAppStore((s) => s.closeWallDetail);
  const openCalc = useAppStore((s) => s.openWallCalculationModal);
  const setSelected = useAppStore((s) => s.setSelectedEntityIds);
  const wall =
    project.walls.find((w) => w.id === wallDetailWallId) ??
    project.walls.find((w) => selectedIds.includes(w.id)) ??
    project.walls[0] ??
    null;
  const calc = wall ? project.wallCalculations.find((c) => c.wallId === wall.id) ?? null : null;

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState(0.12);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const fitGenerationRef = useRef(0);
  const svgUid = useId().replace(/:/g, "");

  const openingsOnWall = useMemo(() => {
    if (!wall) return [];
    return project.openings
      .filter((o) => o.wallId === wall.id && o.offsetFromStartMm != null)
      .sort((a, b) => (a.offsetFromStartMm ?? 0) - (b.offsetFromStartMm ?? 0));
  }, [project.openings, wall]);

  const wallLabel = wall ? wallMarkLabelForDisplay(wall.markLabel, wall.id.slice(0, 8)) : "";

  const lumberRows = useMemo(() => {
    if (!calc || !wall) return [];
    const idxById = lumberDisplayIndexByPieceId(calc.lumberPieces);
    return lumberPiecesSortedForDisplay(calc.lumberPieces).map((p) => {
      const n = idxById.get(p.id) ?? 0;
      return {
        n,
        id: p.id,
        mark: formatLumberFullDisplayMark(p.wallMark, n),
        section: `${Math.round(p.sectionThicknessMm)}x${Math.round(p.sectionDepthMm)}`,
        length: Math.round(p.lengthMm),
        qty: 1,
        piece: p,
      };
    });
  }, [calc, wall]);

  const sipRows = useMemo(() => {
    if (!calc || !wall) return [];
    const wallThicknessMm = wall.thicknessMm;
    const panelHeightMm = wall.heightMm;
    return sipRegionsSortedForDisplay(calc.sipRegions).map((r, i) => ({
      mark: formatSipPanelDisplayMark(wallLabel, i),
      size: `${Math.round(r.widthMm)}x${Math.round(panelHeightMm)}x${Math.round(wallThicknessMm)}`,
      qty: 1,
      region: r,
    }));
  }, [calc, wall, wallLabel]);

  const L = wall ? Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) : 0;
  const H = wall?.heightMm ?? 0;

  const layout = useMemo(() => {
    if (!wall) return null;
    const wallTop = SHEET_WALL_TOP_MM;
    const wallBottom = wallTop + H;
    const titleBaseline = wallTop - TITLE_ABOVE_WALL_MM;

    /** Высота полосы «вида сверху» в мм листа = реальная толщина стены (как на 2D, 1:1 с длиной). */
    const topViewH = wall.thicknessMm;
    const topViewY = wallBottom + GAP_WALL_BOTTOM_TO_TOPVIEW_MM + TOPVIEW_TITLE_SPACE_MM;
    const topViewBottom = topViewY + topViewH;

    const frontLevel1 = calc ? calc.sipRegions.map((r) => ({ a: r.startOffsetMm, b: r.endOffsetMm, text: `${Math.round(r.widthMm)}` })) : [];
    const frontLevel2 = buildOpeningGapSegments(L, openingsOnWall);
    const frontLevel3 = [{ a: 0, b: L, text: `${Math.round(L)}` }];

    /** Одна SIP-панель на всю длину — общий габарит уже в первой цепочке; третья строка дублировала бы число (напр. 5937). */
    const showOverallLengthRow = !(
      calc &&
      calc.sipRegions.length === 1 &&
      Math.abs(calc.sipRegions[0]!.startOffsetMm) < 0.5 &&
      Math.abs(calc.sipRegions[0]!.endOffsetMm - L) < 0.5
    );

    let y = topViewBottom + GAP_BETWEEN_DIM_ROWS_MM;
    const dimRow1Y = y;
    y = bottomOfDimLevel(dimRow1Y, frontLevel1) + GAP_BETWEEN_DIM_ROWS_MM;
    const dimRow2Y = y;
    y = bottomOfDimLevel(dimRow2Y, frontLevel2) + GAP_BETWEEN_DIM_ROWS_MM;
    const dimRow3Y = y;
    const sheetBottom = showOverallLengthRow
      ? bottomOfDimLevel(dimRow3Y, frontLevel3) + SHEET_PAD_BOTTOM_MM
      : bottomOfDimLevel(dimRow2Y, frontLevel2) + SHEET_PAD_BOTTOM_MM;

    return {
      wallTop,
      wallBottom,
      titleBaseline,
      topViewY,
      topViewH,
      topViewBottom,
      dimRow1Y,
      dimRow2Y,
      dimRow3Y,
      sheetBottom,
      frontLevel1,
      frontLevel2,
      frontLevel3,
      showOverallLengthRow,
    };
  }, [wall, H, L, calc, openingsOnWall]);

  const sheetBounds = useMemo(() => {
    if (!wall || !layout) {
      return { minX: 0, minY: 0, maxX: 1600, maxY: 1200 };
    }
    const {
      wallTop,
      wallBottom,
      titleBaseline,
      topViewY,
      topViewH,
      dimRow2Y,
      dimRow3Y,
      sheetBottom,
      frontLevel2,
      frontLevel3,
      showOverallLengthRow,
    } = layout;

    let minX = LEFT_DIM_X0_MM;
    let maxX = L + 48;
    let minY = Math.min(titleBaseline - 36, wallTop - 8);
    let maxY = sheetBottom;

    for (const o of openingsOnWall) {
      const x = o.offsetFromStartMm ?? 0;
      const openTopY = o.kind === "door" ? wallBottom - o.heightMm : wallBottom - o.heightMm - (o.sillHeightMm ?? 0);
      const labelY = openTopY - 14;
      minY = Math.min(minY, labelY - 8);
      maxX = Math.max(maxX, x + o.widthMm + 8);
    }

    if (calc) {
      for (const p of calc.lumberPieces) {
        const rr = lumberPieceWallElevationRectMm(p, wall, project, calc);
        minX = Math.min(minX, rr.x0 - 4);
        maxX = Math.max(maxX, rr.x1 + 4);
        const rectTop = wallTop + H - rr.b1;
        const rh = rr.b1 - rr.b0;
        minY = Math.min(minY, rectTop - 4);
        maxY = Math.max(maxY, rectTop + rh + 4);
      }
      for (const r of calc.sipRegions) {
        maxX = Math.max(maxX, r.endOffsetMm + 8);
      }
    }

    minY = Math.min(minY, titleBaseline - 40);
    maxY = Math.max(maxY, topViewY + topViewH + 8);
    if (showOverallLengthRow) {
      maxY = Math.max(maxY, bottomOfDimLevel(dimRow3Y, frontLevel3));
    } else {
      maxY = Math.max(maxY, bottomOfDimLevel(dimRow2Y, frontLevel2));
    }

    minX = Math.min(minX, -128);
    maxX = Math.max(maxX, L + 24);
    maxY = Math.max(maxY, sheetBottom);

    return { minX, minY, maxX, maxY };
  }, [wall, layout, L, H, calc, project, openingsOnWall]);

  const applyFit = useCallback(() => {
    if (!layout) return;
    const { minX, minY, maxX, maxY } = sheetBounds;
    const cw = Math.max(1, viewport.w);
    const ch = Math.max(1, viewport.h);
    const bw = maxX - minX;
    const bh = maxY - minY;
    if (bw < 1 || bh < 1) return;
    const pad = FIT_PADDING_PX;
    const z = Math.min((cw - 2 * pad) / bw, (ch - 2 * pad) / bh);
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    setZoom(clamped);
    setPanX(pad - minX * clamped);
    setPanY(pad - minY * clamped);
  }, [layout, sheetBounds, viewport.w, viewport.h]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    const r0 = el.getBoundingClientRect();
    setViewport({ w: Math.floor(r0.width), h: Math.floor(r0.height) });
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!wall || !layout) return;
    const gen = ++fitGenerationRef.current;
    const id = requestAnimationFrame(() => {
      if (gen !== fitGenerationRef.current) return;
      applyFit();
    });
    return () => cancelAnimationFrame(id);
  }, [wall?.id, L, H, layout, applyFit, viewport.w, viewport.h]);

  const sx = useCallback((x: number) => panX + x * zoom, [panX, zoom]);
  const sy = useCallback((y: number) => panY + y * zoom, [panY, zoom]);

  if (!wall || !layout) {
    return <div className="wd-empty">Нет стен для отображения.</div>;
  }

  const {
    wallTop,
    wallBottom,
    titleBaseline,
    topViewY,
    topViewH,
    dimRow1Y,
    dimRow2Y,
    dimRow3Y,
    frontLevel1,
    frontLevel2,
    frontLevel3,
    showOverallLengthRow,
  } = layout;

  const panelHeightMm = H;
  const panelTop = wallTop;
  const plateT = calc?.settingsSnapshot.plateBoardThicknessMm ?? 45;
  /** Ядро SIP между обвязками — заливка/маски панелей, 3D EPS в core. */
  const coreTop = wallTop + plateT;
  const coreBottom = wallBottom - plateT;
  /** Вертикальные штрих-пунктиры стыков OSB на фасаде — полная высота стены (как вертикальные швы панели в 3D), не полоса ядра. */
  const sipOsbSeamYTop = wallTop;
  const sipOsbSeamYBottom = wallBottom;

  const sipAlongSpan = useMemo(() => {
    if (!calc || calc.sipRegions.length === 0) {
      return { x0: 0, x1: L };
    }
    return {
      x0: Math.min(...calc.sipRegions.map((r) => r.startOffsetMm)),
      x1: Math.max(...calc.sipRegions.map((r) => r.endOffsetMm)),
    };
  }, [calc, L]);

  const internalSeamCentersAlong = useMemo(
    () => (calc ? internalWallJointSeamCentersAlongMm(calc) : []),
    [calc],
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const sheetX = (mx - panX) / zoom;
    const sheetY = (my - panY) / zoom;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
    setPanX(mx - sheetX * next);
    setPanY(my - sheetY * next);
    setZoom(next);
  };

  return (
    <div className="wd-root">
      <div className="wd-head">
        <button
          type="button"
          className="btn"
          onClick={() => {
            closeWallDetail();
          }}
        >
          Назад к плану
        </button>
        <div className="wd-title">{wall.markLabel?.trim() || wall.id.slice(0, 8)}</div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setSelected([wall.id]);
            openCalc();
          }}
        >
          Пересчитать стену
        </button>
      </div>
      <div className="wd-body">
        <div
          ref={wrapRef}
          className="wd-canvas-wrap"
          onWheel={onWheel}
          onPointerDown={(e) => {
            setDrag({ x: e.clientX, y: e.clientY, panX, panY });
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            setPanX(drag.panX + (e.clientX - drag.x));
            setPanY(drag.panY + (e.clientY - drag.y));
          }}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            applyFit();
          }}
        >
          <svg
            ref={svgRef}
            className="wd-canvas"
            viewBox={`0 0 ${Math.max(1, viewport.w)} ${Math.max(1, viewport.h)}`}
            preserveAspectRatio="none"
          >
            <text x={sx(L / 2)} y={sy(titleBaseline)} className="wd-wall-title">
              {wall.markLabel?.trim() || wall.id.slice(0, 8)}
            </text>
            <rect x={sx(0)} y={sy(wallTop)} width={Math.max(1, L * zoom)} height={Math.max(1, H * zoom)} className="wd-wall" />
            <rect x={sx(0)} y={sy(panelTop)} width={Math.max(1, L * zoom)} height={Math.max(1, panelHeightMm * zoom)} className="wd-panel-outline" />
            <VerticalDimensionMm
              xLineMm={-40}
              y0Mm={wallTop}
              y1Mm={wallBottom}
              text={`${Math.round(H)} мм`}
              sx={sx}
              sy={sy}
            />

            {calc ? (
              <defs>
                <pattern
                  id={`${svgUid}-sip-hatch`}
                  patternUnits="userSpaceOnUse"
                  width={Math.max(4, 13 * zoom)}
                  height={Math.max(4, 13 * zoom)}
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={Math.max(4, 13 * zoom)}
                    className="wd-sip-hatch-line"
                  />
                </pattern>
              </defs>
            ) : null}

            {calc
              ? calc.sipRegions.map((r) => {
                  const px0 = r.startOffsetMm;
                  const px1 = r.endOffsetMm;
                  const wMm = px1 - px0;
                  const hCoreMm = coreBottom - coreTop;
                  const holes = sipPanelHoleRectsMm(px0, px1, coreTop, coreBottom, openingsOnWall, wallBottom);
                  const maskId = `${svgUid}-sipmask-${r.index}`;
                  const wPx = Math.max(1, wMm * zoom);
                  const hPx = Math.max(1, hCoreMm * zoom);
                  return (
                    <g key={r.id} className="wd-sip-panel-layer">
                      <rect x={sx(px0)} y={sy(coreTop)} width={wPx} height={hPx} className="wd-sip" />
                      <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                        <rect x={sx(px0)} y={sy(coreTop)} width={wPx} height={hPx} fill="white" />
                        {holes.map((h, hi) => {
                          const hw = Math.max(1, (h.x1 - h.x0) * zoom);
                          const hh = Math.max(1, (h.y1 - h.y0) * zoom);
                          return <rect key={hi} x={sx(h.x0)} y={sy(h.y0)} width={hw} height={hh} fill="black" />;
                        })}
                      </mask>
                      <rect
                        x={sx(px0)}
                        y={sy(coreTop)}
                        width={wPx}
                        height={hPx}
                        fill={`url(#${svgUid}-sip-hatch)`}
                        mask={`url(#${maskId})`}
                        className="wd-sip-hatch-layer"
                      />
                    </g>
                  );
                })
              : null}

            {calc
              ? lumberRows.map((r) => {
                  const rr = lumberPieceWallElevationRectMm(r.piece, wall, project, calc);
                  const rw = Math.max(1, rr.x1 - rr.x0);
                  const rh = Math.max(1, rr.b1 - rr.b0);
                  const rectTop = wallTop + H - rr.b1;
                  return (
                    <g key={`piece-${r.id}`}>
                      <rect x={sx(rr.x0)} y={sy(rectTop)} width={rw * zoom} height={rh * zoom} className="wd-piece" />
                      <text x={sx(rr.x0 + rw / 2)} y={sy(rectTop + rh / 2)} className="wd-piece-n">
                        {r.n}
                      </text>
                    </g>
                  );
                })
              : null}

            {openingsOnWall.map((o) => {
              const x = o.offsetFromStartMm ?? 0;
              const y = o.kind === "door" ? wallBottom - o.heightMm : wallBottom - o.heightMm - (o.sillHeightMm ?? 0);
              const mark = o.markLabel?.trim() || (o.kind === "door" ? `Д_${o.doorSequenceNumber ?? "?"}` : `OK_${o.windowSequenceNumber ?? "?"}`);
              return (
                <g key={o.id}>
                  <rect x={sx(x)} y={sy(y)} width={Math.max(1, o.widthMm * zoom)} height={Math.max(1, o.heightMm * zoom)} className="wd-opening" />
                  <text x={sx(x + o.widthMm / 2)} y={sy(y - 12)} className="wd-open-label">{`${mark} ${Math.round(o.widthMm)}/${Math.round(o.heightMm)}`}</text>
                </g>
              );
            })}

            {/* Пунктир стыков OSB: Y = полная высота стены (wallTop…wallBottom), X = internalWallJointSeamCentersAlongMm. */}
            {calc ? (
              <g className="wd-sip-seam-overlay" pointerEvents="none">
                <line
                  x1={sx(sipAlongSpan.x0)}
                  y1={sy(sipOsbSeamYTop)}
                  x2={sx(sipAlongSpan.x1)}
                  y2={sy(sipOsbSeamYTop)}
                  className="wd-sip-seam"
                />
                <line
                  x1={sx(sipAlongSpan.x0)}
                  y1={sy(sipOsbSeamYBottom)}
                  x2={sx(sipAlongSpan.x1)}
                  y2={sy(sipOsbSeamYBottom)}
                  className="wd-sip-seam"
                />
                {internalSeamCentersAlong.map((cx) => (
                  <line
                    key={`sip-seam-v-${cx.toFixed(2)}`}
                    x1={sx(cx)}
                    y1={sy(sipOsbSeamYTop)}
                    x2={sx(cx)}
                    y2={sy(sipOsbSeamYBottom)}
                    className="wd-sip-seam"
                  />
                ))}
              </g>
            ) : null}

            {calc
              ? sipRegionsSortedForDisplay(calc.sipRegions).map((r, i) => (
                  <text
                    key={`sip-label-${r.id}`}
                    x={sx((r.startOffsetMm + r.endOffsetMm) / 2)}
                    y={sy((coreTop + coreBottom) / 2)}
                    className="wd-panel-mark"
                  >
                    {formatSipPanelDisplayMark(wallLabel, i)}
                  </text>
                ))
              : null}

            <text x={sx(0)} y={sy(wallBottom + GAP_WALL_BOTTOM_TO_TOPVIEW_MM)} className="wd-subtitle">
              Вид сверху
            </text>
            <WallDetailTopViewPlan
              wall={wall}
              lengthMm={L}
              project={project}
              wallCalculation={calc}
              topViewY={topViewY}
              zoom={zoom}
              sx={sx}
              sy={sy}
              openings={project.openings}
            />
            <VerticalDimensionMm
              xLineMm={-44}
              y0Mm={topViewY}
              y1Mm={topViewY + topViewH}
              text={`${Math.round(wall.thicknessMm)} мм`}
              sx={sx}
              sy={sy}
              labelGapPx={WD_DIM_V_LABEL_GAP_PX + WD_DIM_V_LABEL_GAP_EXTRA_PX}
            />

            {drawDimensionLevel(frontLevel1, dimRow1Y, sx, sy, DIM_ROW_STACK_STEP_MM)}
            {drawDimensionLevel(frontLevel2, dimRow2Y, sx, sy, DIM_ROW_STACK_STEP_MM)}
            {showOverallLengthRow ? drawDimensionLevel(frontLevel3, dimRow3Y, sx, sy, DIM_ROW_STACK_STEP_MM) : null}
          </svg>
          <div className="wd-hint">Колесо: масштаб · ЛКМ+drag: панорама · двойной клик по полю — вписать лист</div>
        </div>
        <aside className="wd-side">
          <section className="wd-card">
            <h3>Доски по стене</h3>
            {!calc ? (
              <div className="wd-empty-note">Стена ещё не рассчитана. Нажмите «Пересчитать стену».</div>
            ) : (
              <table className="wd-table">
                <thead>
                  <tr><th>N</th><th>Марк</th><th>Сечение</th><th>Длина</th><th>Кол</th></tr>
                </thead>
                <tbody>
                  {lumberRows.map((r) => (
                    <tr key={`${r.mark}-${r.id}`}>
                      <td>{r.n}</td><td>{r.mark}</td><td>{r.section}</td><td>{r.length}</td><td>{r.qty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Итого</td>
                    <td>{Math.round(lumberRows.reduce((s, r) => s + r.length, 0))}</td>
                    <td>{lumberRows.length}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
          <section className="wd-card">
            <h3>SIP-панели по стене</h3>
            {!calc ? (
              <div className="wd-empty-note">Нет данных SIP до расчёта.</div>
            ) : (
              <table className="wd-table">
                <thead>
                  <tr><th>Марк</th><th>Размер</th><th>Кол</th></tr>
                </thead>
                <tbody>
                  {sipRows.map((r, i) => (
                    <tr key={`${r.mark}-${i}`}>
                      <td>{r.mark}</td><td>{r.size}</td><td>{r.qty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Итого</td>
                    <td>{sipRows.length}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function buildOpeningGapSegments(
  wallLenMm: number,
  openings: readonly { offsetFromStartMm: number | null; widthMm: number }[],
): { a: number; b: number; text: string }[] {
  const points = [0, wallLenMm];
  for (const o of openings) {
    if (o.offsetFromStartMm == null) continue;
    points.push(o.offsetFromStartMm, o.offsetFromStartMm + o.widthMm);
  }
  points.sort((a, b) => a - b);
  const out: { a: number; b: number; text: string }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (b - a < 2) continue;
    out.push({ a, b, text: `${Math.round(b - a)}` });
  }
  return out;
}
