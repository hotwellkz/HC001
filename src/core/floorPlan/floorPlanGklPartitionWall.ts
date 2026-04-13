import { getProfileById } from "@/core/domain/profileOps";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";
import { inferCoreDepthMmFromProfile } from "@/core/domain/wallManufacturing";

/**
 * Перегородка ГКЛ (тонкая стена с облицовкой гипсокартоном, без толстого SIP-ядра).
 * Наружные несущие SIP-стены с утеплителем не считаются перегородкой.
 */
export function isGklPartitionWall(project: Project, wall: Wall): boolean {
  const p = wall.profileId ? getProfileById(project, wall.profileId) : undefined;
  if (!p || p.category !== "wall" || p.compositionMode !== "layered" || p.layers.length < 2) {
    return false;
  }
  const layers = [...p.layers].sort((a, b) => a.orderIndex - b.orderIndex);
  const hasGypsum = layers.some((l) => l.materialType === "gypsum");
  if (!hasGypsum) {
    return false;
  }
  const first = layers[0]?.materialType;
  const last = layers[layers.length - 1]?.materialType;
  const sipLikeShell = first === "osb" && last === "osb";
  const coreDepth = inferCoreDepthMmFromProfile(p) ?? 0;
  if (sipLikeShell && coreDepth >= 60) {
    return false;
  }
  return true;
}
