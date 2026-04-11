import type { FoundationPileEntity } from "./foundationPile";
import { newEntityId } from "./ids";
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

export function duplicateFoundationPileInProject(
  project: Project,
  sourcePileId: string,
): { readonly project: Project; readonly newPileId: string } | { readonly error: string } {
  const pile = project.foundationPiles.find((p) => p.id === sourcePileId);
  if (!pile) {
    return { error: "Свая не найдена." };
  }
  const t = nowIso();
  const { autoPileBatchId: _dropAuto, ...rest } = pile;
  const dup: FoundationPileEntity = {
    ...rest,
    id: newEntityId(),
    createdAt: t,
    updatedAt: t,
  };
  return {
    project: touchProjectMeta({ ...project, foundationPiles: [...project.foundationPiles, dup] }),
    newPileId: dup.id,
  };
}
