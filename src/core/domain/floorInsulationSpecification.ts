import { computeFloorInsulationGeometryFingerprint } from "./floorInsulationFingerprint";
import type { FloorInsulationPiece } from "./floorInsulation";
import type { Project } from "./project";

export interface FloorInsulationSpecRow {
  readonly layerId: string;
  readonly layerName: string;
  readonly pieceId: string;
  readonly profileName: string;
  readonly profileId: string | null;
  readonly materialLabel: string;
  readonly thicknessMm: number;
  readonly areaMm2: number;
  readonly volumeMm3: number;
  readonly isFullSheet: boolean;
  readonly isStale: boolean;
  readonly outlineBoundsLabel: string;
}

function bboxLabel(ring: readonly { readonly x: number; readonly y: number }[]): string {
  if (ring.length === 0) {
    return "—";
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  return `${w}×${h} мм`;
}

export function buildFloorInsulationSpecificationRows(project: Project): readonly FloorInsulationSpecRow[] {
  const layerName = (id: string) => project.layers.find((l) => l.id === id)?.name ?? id;
  const out: FloorInsulationSpecRow[] = [];
  for (const p of project.floorInsulationPieces) {
    const fp = computeFloorInsulationGeometryFingerprint(project, p.layerId);
    out.push({
      layerId: p.layerId,
      layerName: layerName(p.layerId),
      pieceId: p.id,
      profileName: p.specSnapshot.profileName,
      profileId: p.specSnapshot.profileId,
      materialLabel: p.specSnapshot.materialLabel,
      thicknessMm: p.thicknessMm,
      areaMm2: p.areaMm2,
      volumeMm3: p.volumeMm3,
      isFullSheet: p.isFullSheet,
      isStale: p.geometryFingerprint !== fp,
      outlineBoundsLabel: bboxLabel(p.outlineRingMm),
    });
  }
  return out;
}

export function summarizeFloorInsulationSpec(project: Project): {
  readonly fullSheets: number;
  readonly cuts: number;
  readonly totalAreaMm2: number;
  readonly totalVolumeMm3: number;
  readonly staleCount: number;
} {
  const fpByLayer = new Map<string, string>();
  let fullSheets = 0;
  let cuts = 0;
  let totalAreaMm2 = 0;
  let totalVolumeMm3 = 0;
  let staleCount = 0;
  for (const piece of project.floorInsulationPieces) {
    if (!fpByLayer.has(piece.layerId)) {
      fpByLayer.set(piece.layerId, computeFloorInsulationGeometryFingerprint(project, piece.layerId));
    }
    const fp = fpByLayer.get(piece.layerId)!;
    if (piece.geometryFingerprint !== fp) {
      staleCount++;
    }
    if (piece.isFullSheet) {
      fullSheets++;
    } else {
      cuts++;
    }
    totalAreaMm2 += piece.areaMm2;
    totalVolumeMm3 += piece.volumeMm3;
  }
  return { fullSheets, cuts, totalAreaMm2, totalVolumeMm3, staleCount };
}

export function isFloorInsulationPieceStale(piece: FloorInsulationPiece, project: Project): boolean {
  return piece.geometryFingerprint !== computeFloorInsulationGeometryFingerprint(project, piece.layerId);
}
