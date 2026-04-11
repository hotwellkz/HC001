import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";

import type { Editor3dPickPayload } from "@/core/domain/editor3dPickPayload";
import { buildOpening3dSpecsForProject } from "@/core/domain/opening3dAssemblySpecs";
import type { Opening3dMeshKind, Opening3dMeshSpec } from "@/core/domain/opening3dAssemblySpecs";
import type { ProfileMaterialType } from "@/core/domain/profile";
import type { Project } from "@/core/domain/project";
import { resolveSurfaceTextureBinding } from "@/core/domain/surfaceTextureResolve";
import { surfaceTextureMeshKey } from "@/core/domain/surfaceTextureState";

import {
  HOVER_BOX_OUTLINE_3D,
  SELECTION_BOX_OUTLINE_3D,
  TEXTURE_TOOL_HOVER_OUTLINE_3D,
  TEXTURE_TOOL_LOCKED_OUTLINE_3D,
} from "./calculationSeamVisual3d";
import { editor3dPickUserData } from "./editor3dPick";
import { editor3dTextureHighlightMatches } from "./editor3dTextureHighlight";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import { meshStandardPresetForMaterialType } from "./materials3d";
import { buildTexturedBoxMaterials, disposeOwnedMaterials } from "./surfaceTextureMaterial3d";
import { isOpening3dMeshVisible } from "./view3dVisibility";
import { getCatalogDiffuseTexture } from "@/core/textures/proceduralDiffuseTextures";
import { getTextureCatalogEntry } from "@/core/textures/textureCatalog";

interface ProjectOpeningMeshesProps {
  readonly project: Project;
  readonly selectedOpeningEntityId: string | null;
  readonly hoverOpeningEntityId: string | null;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}

function materialForKind(kind: Opening3dMeshKind): {
  readonly physical?: boolean;
  readonly color: number;
  readonly roughness: number;
  readonly metalness: number;
  readonly transmission?: number;
  readonly opacity?: number;
  readonly depthWrite?: boolean;
} {
  switch (kind) {
    case "window_glass":
      return {
        physical: true,
        color: 0xa8c5e8,
        roughness: 0.12,
        metalness: 0,
        transmission: 0.9,
        opacity: 0.92,
        depthWrite: false,
      };
    case "window_frame":
    case "window_mullion":
      return { color: 0xd8dee8, roughness: 0.42, metalness: 0.06 };
    case "door_leaf":
      return { color: 0x8b6a45, roughness: 0.58, metalness: 0.04 };
    case "door_frame":
      return { color: 0xb79573, roughness: 0.52, metalness: 0.04 };
    case "door_handle":
      return { color: 0xa7adb6, roughness: 0.26, metalness: 0.72 };
    default:
      return { color: 0xc49a6a, roughness: 0.52, metalness: 0.05 };
  }
}

function OpeningMesh({
  spec,
  project,
  selected,
  hover,
  texturePickHover,
  texturePickLocked,
}: {
  readonly spec: Opening3dMeshSpec;
  readonly project: Project;
  readonly selected: boolean;
  readonly hover: boolean;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}) {
  const m = materialForKind(spec.kind);
  const pick = editor3dPickUserData({
    kind: "opening",
    entityId: spec.openingId,
    reactKey: spec.reactKey,
    openingMeshKind: spec.kind,
  });

  const wall = useMemo(() => project.walls.find((w) => w.id === spec.wallId), [project.walls, spec.wallId]);
  const layerId = wall?.layerId ?? "";

  const texturedMaterials = useMemo(() => {
    if (spec.kind === "window_glass" || !wall) {
      return null;
    }
    const binding = resolveSurfaceTextureBinding(
      project.surfaceTextureState,
      surfaceTextureMeshKey("opening", spec.reactKey),
      layerId,
    );
    if (!binding) {
      return null;
    }
    const entry = getTextureCatalogEntry(binding.textureId);
    if (!entry) {
      return null;
    }
    const tileM = entry.defaultScaleM * (binding.scalePercent / 100);
    const baseMap = getCatalogDiffuseTexture(entry.id, entry.procedural.kind, entry.procedural.seed);
    const mt: ProfileMaterialType =
      spec.kind === "door_leaf"
        ? "wood"
        : spec.kind === "door_handle"
          ? "steel"
          : spec.kind === "door_frame"
            ? "wood"
            : "gypsum";
    const preset = meshStandardPresetForMaterialType(mt);
    return buildTexturedBoxMaterials({
      preset,
      baseMap,
      widthM: spec.width,
      heightM: spec.height,
      depthM: spec.depth,
      tileWorldSizeM: tileM,
      doubleSided: true,
    });
  }, [layerId, project.surfaceTextureState, spec.depth, spec.height, spec.kind, spec.reactKey, spec.width, wall]);

  useEffect(() => {
    return () => {
      if (texturedMaterials) {
        disposeOwnedMaterials(texturedMaterials);
      }
    };
  }, [texturedMaterials]);

  const texLocked = editor3dTextureHighlightMatches("opening", spec.openingId, spec.reactKey, texturePickLocked);
  const texHover =
    !texLocked && editor3dTextureHighlightMatches("opening", spec.openingId, spec.reactKey, texturePickHover);

  return (
    <group>
      {texturedMaterials ? (
        <mesh
          userData={pick}
          material={texturedMaterials}
          position={spec.position}
          rotation={[0, spec.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[spec.width, spec.height, spec.depth]} />
        </mesh>
      ) : (
        <mesh userData={pick} position={spec.position} rotation={[0, spec.rotationY, 0]} castShadow receiveShadow>
          <boxGeometry args={[spec.width, spec.height, spec.depth]} />
          {m.physical ? (
            <meshPhysicalMaterial
              color={m.color}
              roughness={m.roughness}
              metalness={m.metalness}
              transmission={m.transmission ?? 0.9}
              thickness={0.2}
              transparent
              opacity={m.opacity ?? 0.9}
              depthWrite={m.depthWrite !== false}
              side={DoubleSide}
            />
          ) : (
            <meshStandardMaterial
              color={m.color}
              roughness={m.roughness}
              metalness={m.metalness}
              side={DoubleSide}
            />
          )}
        </mesh>
      )}
      {selected ? (
        <ExactBoxSelectionOutline
          width={spec.width}
          height={spec.height}
          depth={spec.depth}
          position={spec.position}
          rotationY={spec.rotationY}
          color={SELECTION_BOX_OUTLINE_3D.color}
          opacity={SELECTION_BOX_OUTLINE_3D.opacity}
        />
      ) : null}
      {hover && !selected ? (
        <ExactBoxSelectionOutline
          width={spec.width}
          height={spec.height}
          depth={spec.depth}
          position={spec.position}
          rotationY={spec.rotationY}
          color={HOVER_BOX_OUTLINE_3D.color}
          opacity={HOVER_BOX_OUTLINE_3D.opacity}
        />
      ) : null}
      {texLocked ? (
        <ExactBoxSelectionOutline
          width={spec.width}
          height={spec.height}
          depth={spec.depth}
          position={spec.position}
          rotationY={spec.rotationY}
          color={TEXTURE_TOOL_LOCKED_OUTLINE_3D.color}
          opacity={TEXTURE_TOOL_LOCKED_OUTLINE_3D.opacity}
        />
      ) : null}
      {texHover ? (
        <ExactBoxSelectionOutline
          width={spec.width}
          height={spec.height}
          depth={spec.depth}
          position={spec.position}
          rotationY={spec.rotationY}
          color={TEXTURE_TOOL_HOVER_OUTLINE_3D.color}
          opacity={TEXTURE_TOOL_HOVER_OUTLINE_3D.opacity}
        />
      ) : null}
    </group>
  );
}

export function ProjectOpeningMeshes({
  project,
  selectedOpeningEntityId,
  hoverOpeningEntityId,
  texturePickHover,
  texturePickLocked,
}: ProjectOpeningMeshesProps) {
  const specs = useMemo(() => {
    return buildOpening3dSpecsForProject(project).filter((s) => isOpening3dMeshVisible(s, project));
  }, [project]);

  if (specs.length === 0) {
    return null;
  }

  return (
    <group name="project-openings-3d">
      {specs.map((s) => (
        <OpeningMesh
          key={s.reactKey}
          spec={s}
          project={project}
          selected={selectedOpeningEntityId != null && s.openingId === selectedOpeningEntityId}
          hover={hoverOpeningEntityId != null && s.openingId === hoverOpeningEntityId}
          texturePickHover={texturePickHover}
          texturePickLocked={texturePickLocked}
        />
      ))}
    </group>
  );
}
