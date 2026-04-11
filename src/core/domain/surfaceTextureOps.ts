import { touchProjectMeta } from "./projectFactory";
import type { Editor3dPickPayload } from "./editor3dPickPayload";
import type { Project } from "./project";
import type { SurfaceTextureBinding } from "./surfaceTextureBinding";
import {
  EMPTY_SURFACE_TEXTURE_STATE,
  type SurfaceTextureState,
  surfaceTextureMeshKey,
} from "./surfaceTextureState";

export type SurfaceTextureApplyMode = "object" | "layer" | "project";

export interface ApplySurfaceTextureInput {
  readonly mode: SurfaceTextureApplyMode;
  readonly reset: boolean;
  readonly binding: SurfaceTextureBinding | null;
  readonly meshKey: string;
  readonly layerId: string;
}

function recordWithoutKey<T>(rec: Readonly<Record<string, T>>, key: string): Readonly<Record<string, T>> {
  if (!(key in rec)) {
    return rec;
  }
  const next: Record<string, T> = { ...rec };
  delete next[key];
  return next;
}

function bindingFromUnknown(u: unknown): SurfaceTextureBinding | null {
  if (!u || typeof u !== "object") {
    return null;
  }
  const o = u as { textureId?: unknown; scalePercent?: unknown };
  if (typeof o.textureId !== "string" || o.textureId.length === 0) {
    return null;
  }
  if (typeof o.scalePercent !== "number" || !Number.isFinite(o.scalePercent) || o.scalePercent <= 0) {
    return null;
  }
  return { textureId: o.textureId, scalePercent: o.scalePercent };
}

export function normalizeSurfaceTextureState(raw: unknown): SurfaceTextureState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_SURFACE_TEXTURE_STATE;
  }
  const o = raw as {
    project?: unknown;
    byLayerId?: unknown;
    byMeshKey?: unknown;
  };
  const project = bindingFromUnknown(o.project) ?? null;
  const byLayerId: Record<string, SurfaceTextureBinding> = {};
  if (o.byLayerId && typeof o.byLayerId === "object") {
    for (const [k, v] of Object.entries(o.byLayerId as Record<string, unknown>)) {
      const b = bindingFromUnknown(v);
      if (b) {
        byLayerId[k] = b;
      }
    }
  }
  const byMeshKey: Record<string, SurfaceTextureBinding> = {};
  if (o.byMeshKey && typeof o.byMeshKey === "object") {
    for (const [k, v] of Object.entries(o.byMeshKey as Record<string, unknown>)) {
      const b = bindingFromUnknown(v);
      if (b) {
        byMeshKey[k] = b;
      }
    }
  }
  return { project, byLayerId, byMeshKey };
}

export function applySurfaceTextureToProject(project: Project, input: ApplySurfaceTextureInput): Project {
  const prev = project.surfaceTextureState ?? EMPTY_SURFACE_TEXTURE_STATE;
  let next: SurfaceTextureState = prev;

  if (input.reset) {
    if (input.mode === "object") {
      next = { ...prev, byMeshKey: recordWithoutKey(prev.byMeshKey, input.meshKey) };
    } else if (input.mode === "layer") {
      next = { ...prev, byLayerId: recordWithoutKey(prev.byLayerId, input.layerId) };
    } else {
      next = { ...prev, project: null };
    }
  } else if (input.binding) {
    if (input.mode === "object") {
      next = { ...prev, byMeshKey: { ...prev.byMeshKey, [input.meshKey]: input.binding } };
    } else if (input.mode === "layer") {
      next = { ...prev, byLayerId: { ...prev.byLayerId, [input.layerId]: input.binding } };
    } else {
      next = { ...prev, project: input.binding };
    }
  }

  return touchProjectMeta({
    ...project,
    surfaceTextureState: next,
  });
}

export function meshKeyFromEditorPick(pick: Editor3dPickPayload): string {
  return surfaceTextureMeshKey(pick.kind, pick.reactKey);
}
