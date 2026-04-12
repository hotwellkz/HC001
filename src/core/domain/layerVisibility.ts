import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";

/** Убирает activeLayerId, несуществующие id и дубликаты. */
export function normalizeVisibleLayerIds(project: Project): readonly string[] {
  const active = project.activeLayerId;
  const valid = new Set(project.layers.map((l) => l.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of project.visibleLayerIds) {
    if (id === active || !valid.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function setVisibleLayerIdsOnProject(project: Project, ids: readonly string[]): Project {
  const next: Project = { ...project, visibleLayerIds: [...ids] };
  return touchProjectMeta({
    ...next,
    visibleLayerIds: [...normalizeVisibleLayerIds(next)],
  });
}

export function removeLayerFromVisibleLayerIds(project: Project, layerId: string): Project {
  const filtered = project.visibleLayerIds.filter((id) => id !== layerId);
  return setVisibleLayerIdsOnProject(project, filtered);
}

/** Убирает id из списка «скрыто в 3D» при удалении слоя проекта. */
export function removeLayerIdFromHidden3dProjectLayerIds(project: Project, layerId: string): Project {
  const cur = project.viewState.hidden3dProjectLayerIds;
  if (!cur.includes(layerId)) {
    return project;
  }
  return touchProjectMeta({
    ...project,
    viewState: {
      ...project.viewState,
      hidden3dProjectLayerIds: cur.filter((id) => id !== layerId),
    },
  });
}
