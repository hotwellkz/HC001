import type { FoundationStripEntity } from "@/core/domain/foundationStrip";
import type { Point2D } from "@/core/geometry/types";
import type { ProjectFileV1 } from "@/core/io/projectWire";

/**
 * Firestore не допускает вложенные массивы. В wire v1 у footprint_poly поле
 * holeRingsMm — это массив контуров (массив массивов точек), что ломает updateDoc.
 * При записи в Firestore оборачиваем каждое кольцо в объект { ringMm: [...] }.
 */
export const FIRESTORE_FOOTPRINT_HOLE_RING_KEY = "ringMm" as const;

interface FirestoreFootprintHoleWrapper {
  readonly ringMm: Point2D[];
}

function isHoleRingsFirestoreWrapped(raw: unknown): raw is FirestoreFootprintHoleWrapper[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return false;
  }
  const h0 = raw[0];
  if (typeof h0 !== "object" || h0 === null || Array.isArray(h0)) {
    return false;
  }
  return FIRESTORE_FOOTPRINT_HOLE_RING_KEY in h0;
}

function decodeFoundationStripFromFirestoreWire(e: FoundationStripEntity): FoundationStripEntity {
  if (e.kind !== "footprint_poly") {
    return e;
  }
  const raw = e.holeRingsMm as unknown;
  if (!isHoleRingsFirestoreWrapped(raw)) {
    return e;
  }
  return {
    ...e,
    holeRingsMm: raw.map((w) => w.ringMm),
  };
}

function encodeFoundationStripForFirestoreWire(e: FoundationStripEntity): FoundationStripEntity | Record<string, unknown> {
  if (e.kind !== "footprint_poly") {
    return e;
  }
  return {
    ...e,
    holeRingsMm: e.holeRingsMm.map((ring) => ({
      [FIRESTORE_FOOTPRINT_HOLE_RING_KEY]: [...ring],
    })),
  };
}

/** Подготовка payload для setDoc/updateDoc (без вложенных массивов). */
export function encodeProjectWireForFirestore(wire: ProjectFileV1): ProjectFileV1 {
  const fs = wire.foundationStrips;
  if (!fs?.length) {
    return wire;
  }
  return {
    ...wire,
    foundationStrips: fs.map((e) => encodeFoundationStripForFirestoreWire(e) as FoundationStripEntity),
  };
}

/** Восстановление доменного wire после чтения из Firestore. */
export function decodeProjectWireFromFirestore(wire: ProjectFileV1): ProjectFileV1 {
  const fs = wire.foundationStrips;
  if (!fs?.length) {
    return wire;
  }
  return {
    ...wire,
    foundationStrips: fs.map(decodeFoundationStripFromFirestoreWire),
  };
}
