import { newEntityId } from "./ids";
import type { FoundationStripEntity } from "./foundationStrip";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

function translatePoint(p: { readonly x: number; readonly y: number }, dx: number, dy: number) {
  return { x: p.x + dx, y: p.y + dy };
}

/** Смещение геометрии ленты; id и прочие поля сохраняются. */
export function shiftFoundationStripGeometryMm(e: FoundationStripEntity, dxMm: number, dyMm: number): FoundationStripEntity {
  if (e.kind === "segment") {
    return {
      ...e,
      axisStart: translatePoint(e.axisStart, dxMm, dyMm),
      axisEnd: translatePoint(e.axisEnd, dxMm, dyMm),
    };
  }
  if (e.kind === "ortho_ring") {
    return {
      ...e,
      axisXminMm: e.axisXminMm + dxMm,
      axisXmaxMm: e.axisXmaxMm + dxMm,
      axisYminMm: e.axisYminMm + dyMm,
      axisYmaxMm: e.axisYmaxMm + dyMm,
    };
  }
  const outer = e.outerRingMm.map((p) => translatePoint(p, dxMm, dyMm));
  const holes = e.holeRingsMm.map((ring) => ring.map((p) => translatePoint(p, dxMm, dyMm)));
  return {
    ...e,
    outerRingMm: outer,
    holeRingsMm: holes,
  };
}

/** Копия сущности ленты на том же месте с новым id (для клонирования перед сдвигом). */
export function cloneFoundationStripEntityNewId(e: FoundationStripEntity): FoundationStripEntity {
  if (e.kind === "segment") {
    return { ...e, id: newEntityId() };
  }
  if (e.kind === "ortho_ring") {
    return { ...e, id: newEntityId() };
  }
  return { ...e, id: newEntityId() };
}

export function translateFoundationStripsInProjectByIds(
  project: Project,
  stripIds: ReadonlySet<string>,
  dxMm: number,
  dyMm: number,
): Project {
  if (!Number.isFinite(dxMm) || !Number.isFinite(dyMm) || (Math.abs(dxMm) < 1e-9 && Math.abs(dyMm) < 1e-9)) {
    return project;
  }
  const next = project.foundationStrips.map((s) =>
    stripIds.has(s.id) ? shiftFoundationStripGeometryMm(s, dxMm, dyMm) : s,
  );
  return touchProjectMeta({ ...project, foundationStrips: next });
}
