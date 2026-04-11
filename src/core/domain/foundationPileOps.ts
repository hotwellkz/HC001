import type { FoundationPileEntity } from "./foundationPile";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

function nowIso(): string {
  return new Date().toISOString();
}

export function translateFoundationPilesInProject(
  project: Project,
  pileIds: ReadonlySet<string>,
  dxMm: number,
  dyMm: number,
): Project {
  if (!Number.isFinite(dxMm) || !Number.isFinite(dyMm) || (Math.abs(dxMm) < 1e-9 && Math.abs(dyMm) < 1e-9)) {
    return project;
  }
  const t = nowIso();
  const piles: FoundationPileEntity[] = project.foundationPiles.map((p) =>
    pileIds.has(p.id)
      ? {
          ...p,
          centerX: p.centerX + dxMm,
          centerY: p.centerY + dyMm,
          updatedAt: t,
        }
      : p,
  );
  return touchProjectMeta({ ...project, foundationPiles: piles });
}
