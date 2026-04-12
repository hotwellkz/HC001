import type { FloorBeamEntity } from "./floorBeam";
import type { Project } from "./project";

function beamSignature(b: FloorBeamEntity): string {
  return [
    b.id,
    b.profileId,
    b.linearPlacementMode,
    b.sectionRolled ? "1" : "0",
    b.baseElevationMm.toFixed(3),
    b.refStartMm.x.toFixed(3),
    b.refStartMm.y.toFixed(3),
    b.refEndMm.x.toFixed(3),
    b.refEndMm.y.toFixed(3),
  ].join("|");
}

/**
 * Строковый отпечаток геометрии балок слоя (и плит перекрытия на слое) для определения устаревания раскладки.
 */
export function computeFloorInsulationGeometryFingerprint(project: Project, layerId: string): string {
  const beams = project.floorBeams
    .filter((b) => b.layerId === layerId)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(beamSignature)
    .join(";");
  const slabs = project.slabs
    .filter((s) => s.layerId === layerId && s.structuralPurpose !== "foundation")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => {
      const pts = s.pointsMm.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("/");
      return `${s.id}|${s.levelMm}|${s.depthMm}|${pts}`;
    })
    .join(";");
  return `v1|${layerId}|${beams}#${slabs}`;
}
