import { useMemo } from "react";
import { DoubleSide } from "three";

import type { Project } from "@/core/domain/project";

import { meshStandardPresetForLayerOrDefault } from "./materials3d";
import { selectWallsForScene3d } from "./selectors/walls3d";
import { isWallMeshSpecVisible } from "./view3dVisibility";
import { wallsToMeshSpecs } from "./wallMeshSpec";

interface ProjectWallsProps {
  readonly project: Project;
}

const MM_TO_M = 0.001;
const SEAM_DEPTH_MM = 8;
const SEAM_WIDTH_MM = 2;
const SEAM_FACE_OFFSET_MM = 0.8;

interface OsbSeamSpec {
  readonly key: string;
  readonly position: readonly [number, number, number];
  readonly rotationY: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

function subtractYIntervals(baseLo: number, baseHi: number, cuts: readonly { lo: number; hi: number }[]): [number, number][] {
  let segments: [number, number][] = [[baseLo, baseHi]];
  for (const c of cuts) {
    const next: [number, number][] = [];
    for (const [a, b] of segments) {
      if (c.hi <= a || c.lo >= b) {
        next.push([a, b]);
        continue;
      }
      if (a < c.lo) {
        next.push([a, Math.min(c.lo, b)]);
      }
      if (c.hi < b) {
        next.push([Math.max(c.hi, a), b]);
      }
    }
    segments = next.filter(([a, b]) => b - a > 1e-3);
  }
  return segments;
}

function seamSpecsForProject(project: Project): readonly OsbSeamSpec[] {
  const out: OsbSeamSpec[] = [];
  for (const calc of project.wallCalculations) {
    const wall = project.walls.find((w) => w.id === calc.wallId);
    if (!wall) {
      continue;
    }
    const sx = wall.start.x;
    const sy = wall.start.y;
    const ex = wall.end.x;
    const ey = wall.end.y;
    const dx = ex - sx;
    const dy = ey - sy;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) {
      continue;
    }
    const ux = dx / L;
    const uy = dy / L;
    const nx = -dy / L;
    const nz = dx / L;
    const bottomMm = wall.baseElevationMm ?? 0;
    const jT = calc.settingsSnapshot.jointBoardThicknessMm;
    const regions = [...calc.sipRegions].sort((a, b) => a.startOffsetMm - b.startOffsetMm);
    const seamOffsets: number[] = [];
    const pushSeamAt = (s: number, ySegments: readonly [number, number][], tag: string) => {
      seamOffsets.push(s);
      const px = sx + ux * s;
      const py = sy + uy * s;
      let yi = 0;
      for (const [y0, y1] of ySegments) {
        const yMid = (y0 + y1) / 2;
        const h = y1 - y0;
        if (h < 1e-3) {
          continue;
        }
        for (const side of [-1, 1] as const) {
          const off = side * (wall.thicknessMm / 2 + SEAM_FACE_OFFSET_MM + SEAM_WIDTH_MM / 2);
          out.push({
            key: `${wall.id}-osb-seam-${tag}-${yi}-${side}`,
            position: [
              (px + nx * off) * MM_TO_M,
              (bottomMm + yMid) * MM_TO_M,
              (py + nz * off) * MM_TO_M,
            ],
            rotationY: Math.atan2(dx * MM_TO_M, dy * MM_TO_M),
            width: SEAM_WIDTH_MM * MM_TO_M,
            height: h * MM_TO_M,
            depth: SEAM_DEPTH_MM * MM_TO_M,
          });
        }
        yi++;
      }
    };
    for (let i = 0; i < regions.length - 1; i++) {
      const a = regions[i]!;
      const b = regions[i + 1]!;
      const gap = b.startOffsetMm - a.endOffsetMm;
      if (Math.abs(gap - jT) > 1.2) {
        continue;
      }
      const s = a.endOffsetMm;
      const cuts: { lo: number; hi: number }[] = [];
      for (const o of project.openings) {
        if (o.wallId !== wall.id || o.offsetFromStartMm == null) {
          continue;
        }
        const o0 = o.offsetFromStartMm;
        const o1 = o0 + o.widthMm;
        if (s <= o0 + 1e-3 || s >= o1 - 1e-3) {
          continue;
        }
        const sill = o.kind === "window" ? (o.sillHeightMm ?? o.position?.sillLevelMm ?? 900) : 0;
        cuts.push({ lo: Math.max(0, sill), hi: Math.min(wall.heightMm, sill + o.heightMm) });
      }
      const ySegments = subtractYIntervals(0, wall.heightMm, cuts);
      pushSeamAt(s, ySegments, `${i}`);
    }
    for (const o of project.openings) {
      if (o.wallId !== wall.id || o.offsetFromStartMm == null || o.kind !== "window") {
        continue;
      }
      const sill = o.sillHeightMm ?? o.position?.sillLevelMm ?? 900;
      const ySegs: [number, number][] = [];
      if (sill > 1e-3) {
        ySegs.push([0, Math.min(wall.heightMm, sill)]);
      }
      const top = sill + o.heightMm;
      if (top < wall.heightMm - 1e-3) {
        ySegs.push([Math.max(0, top), wall.heightMm]);
      }
      for (const s of [o.offsetFromStartMm, o.offsetFromStartMm + o.widthMm]) {
        if (seamOffsets.some((v) => Math.abs(v - s) < 0.6)) {
          continue;
        }
        pushSeamAt(s, ySegs, `op-${o.id}-${Math.round(s)}`);
      }
    }
  }
  return out;
}

/**
 * Меши стен из domain model; обновляется при любом изменении project.
 */
export function ProjectWalls({ project }: ProjectWallsProps) {
  const specs = useMemo(() => {
    const walls = selectWallsForScene3d(project);
    const all = wallsToMeshSpecs(project, walls);
    return all.filter((s) => isWallMeshSpecVisible(s, project));
  }, [project]);
  const seamSpecs = useMemo(() => seamSpecsForProject(project), [project]);

  return (
    <group name="project-walls">
      {specs.map((s) => {
        const preset = meshStandardPresetForLayerOrDefault(s.materialType);
        return (
          <mesh
            key={s.reactKey}
            position={s.position}
            rotation={[0, s.rotationY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[s.width, s.height, s.depth]} />
            <meshStandardMaterial
              color={preset.color}
              roughness={preset.roughness}
              metalness={preset.metalness}
              side={DoubleSide}
            />
          </mesh>
        );
      })}
      <group name="project-osb-seams">
        {seamSpecs.map((s) => (
          <mesh key={s.key} position={s.position} rotation={[0, s.rotationY, 0]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[s.width, s.height, s.depth]} />
            <meshBasicMaterial color={0x1f2630} transparent opacity={0.72} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
