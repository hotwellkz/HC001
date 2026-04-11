import type { Editor3dPickPayload } from "@/core/domain/editor3dPickPayload";

export function editor3dTextureHighlightMatches(
  kind: Editor3dPickPayload["kind"],
  entityId: string,
  reactKey: string,
  target: Editor3dPickPayload | null | undefined,
): boolean {
  return Boolean(
    target && target.kind === kind && target.entityId === entityId && target.reactKey === reactKey,
  );
}
